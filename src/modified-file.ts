import { readFileSync, writeFileSync } from 'fs';

import {
  CharacterRange,
  extractLineChangeData,
  calculateCharacterRangesFromLineChanges,
} from './utils';
import { getDiffForFile } from './git-utils';
import { PreciseFormatter } from './precise-formatter';

export interface ModifiedFileConfig {
  fullPath: string;
  gitDirectoryParent: string;
  base: string | null;
  head: string | null;
  selectedFormatter: PreciseFormatter<any>;
}

export class ModifiedFile {
  private fullPath: string;
  /**
   * An optional commit SHA pair which will be used to inform how the git
   * commands are run. E.g. `git diff`
   */
  private base: string | null;
  private head: string | null;
  /**
   * The chosen formatter to be run on the modified file.
   */
  private selectedFormatter: PreciseFormatter<any>;
  /**
   * The parent directory of the relevant .git directory that was resolved
   * for the modified file.
   */
  private gitDirectoryParent: string;
  /**
   * The contents of the file in their current state on the user's file
   * system
   */
  public fileContents: string;
  /**
   * The final file contents, after we've run the formatter
   */
  private formattedFileContents: string;
  /**
   * The resolved formatter config which applies to this file
   */
  private formatterConfig: object | null;
  /**
   * The calculated character ranges which have been modified
   * within this file
   */
  private modifiedCharacterRanges: CharacterRange[] = [];

  constructor({
    fullPath,
    gitDirectoryParent,
    base,
    head,
    selectedFormatter,
  }: ModifiedFileConfig) {
    this.fullPath = fullPath;
    this.gitDirectoryParent = gitDirectoryParent;
    this.base = base;
    this.head = head;
    this.selectedFormatter = selectedFormatter;
    this.resolveFileContents();
    this.resolveFormatterConfig();
  }

  /**
   * Return true if the whole file has already been formatted appropriately based on
   * the resolved formatter config. We can use this as a check to skip unnecessary work.
   */
  isAlreadyFormatted(): boolean {
    return this.selectedFormatter.isAlreadyFormatted(
      this.fileContents,
      this.formatterConfig,
    );
  }

  /**
   * Run the formatters check mode on the given ranges and return true if they are all
   * already formatted appropriately based on the resolved formatter config.
   */
  hasValidFormattingForCharacterRanges(): boolean {
    return this.selectedFormatter.checkFormattingOfRanges(
      this.fileContents,
      this.formatterConfig,
      this.modifiedCharacterRanges,
    );
  }

  /**
   * Run the formatter on the file contents and store the result
   */
  formatCharacterRangesWithinContents(): void {
    this.formattedFileContents = this.selectedFormatter.formatRanges(
      this.fileContents,
      this.formatterConfig,
      this.modifiedCharacterRanges,
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
      const diff = getDiffForFile(
        this.gitDirectoryParent,
        this.fullPath,
        this.base,
        this.head,
      );
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
   * Resolve and cache the relevant formatter config.
   */
  private resolveFormatterConfig() {
    this.formatterConfig = this.selectedFormatter.resolveConfig(this.fullPath);
  }
}
