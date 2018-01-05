import * as fs from 'fs';
import { extname, join } from 'path';
import { resolveConfig, format, getSupportInfo, Options } from 'prettier';

const ignore = require('ignore');

/**
 * Resolve the user's prettier config
 */
export function resolvePrettierConfigForFile(filename: string): Options | null {
  return resolveConfig.sync(filename, { useCache: false });
}

/**
 * Format the given content by running prettier on the specific range data given.
 * This may require running prettier on the file multiple times for multiple ranges.
 */
export function formatRangesWithinContents(
  characterRanges: any[],
  fileContents: string,
  prettierConfig: Options | null,
): string {
  let formattedContents = fileContents;
  characterRanges.forEach((characterRange) => {
    formattedContents = format(formattedContents, {
      ...prettierConfig,
      ...{
        rangeStart: characterRange.rangeStart,
        rangeEnd: characterRange.rangeEnd,
      },
    });
  })
  return formattedContents;
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
