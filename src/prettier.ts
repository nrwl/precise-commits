import * as fs from 'fs';
import { extname, join } from 'path';
import {
  resolveConfig,
  format,
  check,
  getSupportInfo,
  Options,
} from 'prettier';

const ignore = require('ignore');
const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();

/**
 * Resolve the user's prettier config
 */
export function resolvePrettierConfigForFile(filename: string): Options | null {
  return resolveConfig.sync(filename, { useCache: false });
}


/**
 * Run prettier on each character range pair given, and apply the
 * difference as a patch to the original contents using an implementation
 * of the Myer's diff algorithm.
 */
export function formatRangesWithinContents(
  characterRanges: any[],
  fileContents: string,
  prettierConfig: Options | null,
): string {
  let patches: any = [];
  characterRanges.forEach(characterRange => {
    const diffs = dmp.diff_main(
      fileContents,
      format(fileContents, {
        ...prettierConfig,
        ...{
          rangeStart: characterRange.rangeStart,
          rangeEnd: characterRange.rangeEnd,
        },
      }),
    );
    patches = [...patches, ...dmp.patch_make(fileContents, diffs)];
  });
  const [formattedContents] = dmp.patch_apply(patches, fileContents);
  return formattedContents;
}

/**
 * Ensure the given content has been run through prettier for the specific range data given.
 * This may require running prettier on the file multiple times for multiple ranges.
 */
export function checkRangesWithinContents(
  characterRanges: any[],
  fileContents: string,
  prettierConfig: Options | null,
): boolean {
  let formattedContents = fileContents;
  return characterRanges.every(characterRange => {
    return check(formattedContents, {
      ...prettierConfig,
      ...{
        rangeStart: characterRange.rangeStart,
        rangeEnd: characterRange.rangeEnd,
      },
    });
  });
}

/**
 * Return true if the full fileContents is already formatted according
 * to the given prettierConfig
 */
export function isAlreadyFormatted(
  fileContents: string,
  prettierConfig: Options | null,
): boolean {
  return check(fileContents, { ...prettierConfig });
}

let PRETTIER_SUPPORTED_FILE_EXTENSIONS: string[] = [];
getSupportInfo().languages.forEach(language => {
  PRETTIER_SUPPORTED_FILE_EXTENSIONS = [
    ...PRETTIER_SUPPORTED_FILE_EXTENSIONS,
    ...language.extensions,
  ];
});

export function hasPrettierSupportedFileExtension(filename: string) {
  const fileExtension = extname(filename);
  return PRETTIER_SUPPORTED_FILE_EXTENSIONS.includes(fileExtension);
}

export function generatePrettierIgnorePredicate(workingDirectory: string) {
  const prettierIgnoreFilePath = join(workingDirectory, '.prettierignore');
  /**
   * If there is no .prettierignore file present, simply always return true
   * from the predicate
   */
  if (!fs.existsSync(prettierIgnoreFilePath)) {
    return () => true;
  }
  /**
   * Use "ignore"'s createFilter() method to create a predicate
   */
  const prettierIgnoreFileContents = fs.readFileSync(
    prettierIgnoreFilePath,
    'utf8',
  );
  return ignore()
    .add(prettierIgnoreFileContents)
    .createFilter();
}
