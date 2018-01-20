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
  private prettierConfig: Options | null;
  private modifiedCharacterRanges: CharacterRange[] = [];

  constructor(
    private fullPath: string,
    private sha1: string | null,
    private sha2: string | null,
  ) {
    this.readFileContents();
    this.resolvePrettierConfig();
  }

  isAlreadyFormatted(): boolean {
    return isAlreadyFormatted(this.fileContents, this.prettierConfig);
  }

  hasValidFormattingForCharacterRanges(): boolean {
    return checkRangesWithinContents(
      this.modifiedCharacterRanges,
      this.fileContents,
      this.prettierConfig,
    );
  }

  formatCharacterRangesWithinContents(): void {
    this.formattedFileContents = formatRangesWithinContents(
      this.modifiedCharacterRanges,
      this.fileContents,
      this.prettierConfig,
    );
  }

  shouldContentsBeUpdatedOnDisk(): boolean {
    return this.fileContents !== this.formattedFileContents;
  }

  updateFileOnDisk(): void {
    writeFileSync(this.fullPath, this.formattedFileContents);
  }

  calculateModifiedCharacterRanges(): { err: Error | null } {
    try {
      /**
       * Extract line change data from the git diff results
       */
      const diff = this.getDiff();
      const lineChangeData = extractLineChangeData(diff);
      /**
       * Convert the line change data into character data
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

  private getDiff() {
    return getDiffForFile(this.fullPath, this.sha1, this.sha2);
  }

  private readFileContents() {
    this.fileContents = readFileSync(this.fullPath, 'utf8');
  }

  private resolvePrettierConfig() {
    this.prettierConfig = resolvePrettierConfigForFile(this.fullPath);
  }
}
