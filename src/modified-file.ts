import { readFileSync, writeFileSync } from 'fs';
import { Options } from 'prettier';

import {
  isAlreadyFormatted,
  resolvePrettierConfigForFile,
  checkRangesWithinContents,
  formatRangesWithinContents,
} from './prettier';
import {
  CharacterRange,
  extractLineChangeData,
  calculateCharacterRangesFromLineChanges,
} from './utils';
import { getDiffForFile } from './git-utils';

export class ModifiedFile {
  /**
   * The contents of the file in their current state on the user's file
   * system
   */
  private fileContents: string;
  /**
   * The final file contents, after we've run prettier
   */
  private formattedFileContents: string;
  /**
   * The resolved prettier config which applies to this file
   */
  private prettierConfig: Options | null;
  /**
   * The calculated character ranges which have been modified
   * within this file
   */
  private modifiedCharacterRanges: CharacterRange[] = [];

  constructor(
    private fullPath: string,
    private sha1: string | null,
    private sha2: string | null,
  ) {
    this.resolveFileContents();
    this.resolvePrettierConfig();
  }

  /**
   * Return true if the whole file has already been formatted appropriately based on
   * the resolved prettier config. We can use this as a check to skip unnecessary work.
   */
  isAlreadyFormatted(): boolean {
    return isAlreadyFormatted(this.fileContents, this.prettierConfig);
  }

  /**
   * Run prettier's check mode on the given ranges and return true if they are all
   * already formatted appropriately based on the resolved prettier config.
   */
  hasValidFormattingForCharacterRanges(): boolean {
    return checkRangesWithinContents(
      this.modifiedCharacterRanges,
      this.fileContents,
      this.prettierConfig,
    );
  }

  /**
   * Run prettier on the file contents and store the result
   */
  formatCharacterRangesWithinContents(): void {
    this.formattedFileContents = formatRangesWithinContents(
      this.modifiedCharacterRanges,
      this.fileContents,
      this.prettierConfig,
    );
  }

  /**
   * Return true if the formatted file contents are different to
   * what was originally resolved from disk.
   */
  shouldContentsBeUpdatedOnDisk(): boolean {
    return this.fileContents !== this.formattedFileContents;
  }

  /**
   * Write the updated file contents back to disk.
   */
  updateFileOnDisk(): void {
    writeFileSync(this.fullPath, this.formattedFileContents);
  }

  /**
   * We handle errors locally within this method to allow for
   * more granular feedback within the main() function of the
   * library.
   */
  calculateModifiedCharacterRanges(): { err: Error | null } {
    try {
      /**
       * Extract line change data from the git diff results.
       */
      const diff = getDiffForFile(this.fullPath, this.sha1, this.sha2);
      const lineChangeData = extractLineChangeData(diff);
      /**
       * Convert the line change data into character data.
       */
      this.modifiedCharacterRanges = calculateCharacterRangesFromLineChanges(
        lineChangeData,
        this.fileContents,
      );
      return { err: null };
    } catch (err) {
      return { err };
    }
  }

  /**
   * Resolve and cache the relevant file contents.
   */
  private resolveFileContents() {
    this.fileContents = readFileSync(this.fullPath, 'utf8');
  }

  /**
   * Resolve and cache the relevant prettier config.
   */
  private resolvePrettierConfig() {
    this.prettierConfig = resolvePrettierConfigForFile(this.fullPath);
  }
}
