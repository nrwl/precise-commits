import * as fs from 'fs';
import { extname, join } from 'path';
import {
  Options as PrettierOptions,
  getSupportInfo,
  format,
  resolveConfig,
  check,
} from 'prettier';

import { PreciseFormatter } from '../precise-formatter';
import { CharacterRange } from '../utils';

const ignore = require('ignore');
const DiffMatchPatch = require('diff-match-patch');
const dmp = new DiffMatchPatch();

let PRETTIER_SUPPORTED_FILE_EXTENSIONS: string[] = [];
getSupportInfo().languages.forEach(language => {
  PRETTIER_SUPPORTED_FILE_EXTENSIONS = [
    ...PRETTIER_SUPPORTED_FILE_EXTENSIONS,
    ...language.extensions,
  ];
});

export const preciseFormatterPrettier: PreciseFormatter<PrettierOptions> = {
  /**
   * Resolve the relevant prettier config for the given
   * modified file path.
   */
  resolveConfig(modifiedFilePath: string): PrettierOptions | null {
    return {
      ...resolveConfig.sync(modifiedFilePath, {
        useCache: false,
      }),
      filepath: modifiedFilePath,
    };
  },
  /**
   * Return true if the whole file has already been formatted appropriately based on
   * the resolved prettier config. We can use this as a check to skip unnecessary work.
   */
  isAlreadyFormatted(
    fileContents: string,
    config: PrettierOptions | null,
  ): boolean {
    return check(fileContents, { ...config });
  },
  /**
   * Run prettier's check mode on the given ranges and return true if they are all
   * already formatted appropriately based on the given prettier config.
   */
  checkFormattingOfRanges(
    fileContents: string,
    config: PrettierOptions | null,
    characterRanges: CharacterRange[],
  ): boolean {
    let formattedContents = fileContents;
    return characterRanges.every(characterRange => {
      return check(formattedContents, {
        ...config,
        ...{
          rangeStart: characterRange.rangeStart,
          rangeEnd: characterRange.rangeEnd,
        },
      });
    });
  },
  /**
   * Run prettier on each character range pair given, and apply the
   * difference as a patch to the original contents using an implementation
   * of the Myer's diff algorithm.
   */
  formatRanges(
    fileContents: string,
    config: PrettierOptions | null,
    characterRanges: CharacterRange[],
  ): string {
    let patches: any = [];
    characterRanges.forEach(characterRange => {
      const diffs = dmp.diff_main(
        fileContents,
        format(fileContents, {
          ...config,
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
  },
  /**
   * Generate a predicate function which will return true if the filename
   * is not excluded via a .prettierignore file.
   */
  generateIgnoreFilePredicate(workingDirectory: string) {
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
  },
  /**
   * Return true if prettier supports the file extension of the given
   * filename.
   */
  hasSupportedFileExtension(filename: string) {
    const fileExtension = extname(filename);
    return PRETTIER_SUPPORTED_FILE_EXTENSIONS.includes(fileExtension);
  },
};
