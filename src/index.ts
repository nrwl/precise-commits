import { join } from 'path';

import {
  getModifiedFilenames,
  resolveNearestGitDirectoryParent,
} from './git-utils';
import {
  NO_LINE_CHANGE_DATA_ERROR,
  generateFilesWhitelistPredicate,
} from './utils';
import { ModifiedFile } from './modified-file';
import { preciseFormatterPrettier } from './precise-formatters/prettier';

export type ProcessingStatus = 'NOT_UPDATED' | 'UPDATED' | 'INVALID_FORMATTING';

export interface AdditionalOptions {
  checkOnly: boolean;
  filesWhitelist: string[] | null;
  base: string | null;
  head: string | null;
}

export interface Callbacks {
  onInit(workingDirectory: string): void;
  onModifiedFilesDetected(modifiedFilenames: string[]): void;
  onBegunProcessingFile(
    filename: string,
    index: number,
    totalFiles: number,
  ): void;
  onFinishedProcessingFile(
    filename: string,
    index: number,
    status: ProcessingStatus,
  ): void;
  onError(err: Error): void;
  onComplete(totalFiles: number): void;
}

/**
 * LIBRARY
 */
export function main(
  workingDirectory: string,
  additionalOptions: AdditionalOptions,
  callbacks: Callbacks = {
    onInit() {},
    onModifiedFilesDetected() {},
    onBegunProcessingFile() {},
    onFinishedProcessingFile() {},
    onError() {},
    onComplete() {},
  },
) {
  try {
    /**
     * Merge user-given and default options.
     */
    const options = {
      ...{
        filesWhitelist: null,
        base: null,
        head: null,
        checkOnly: false,
        formatter: 'prettier',
      },
      ...additionalOptions,
    };
    /**
     * Note: Will be exposed as an option if/when new formatters are added.
     */
    if (options.formatter !== 'prettier') {
      throw new Error(
        `The only supported value for "formatter" option is "prettier"`,
      );
    }
    const selectedFormatter = preciseFormatterPrettier;
    callbacks.onInit(workingDirectory);
    /**
     * Resolve the relevant .git directory's parent directory up front, as we will need this when
     * executing various `git` commands.
     */
    const gitDirectoryParent = resolveNearestGitDirectoryParent(
      workingDirectory,
    );
    /**
     * We fundamentally check whether or not the file extensions are supported by the given formatter,
     * whether or not they are included in the optional `filesWhitelist` array, and that the user
     * has not chosen to ignore them via any supported "ignore" mechanism of the formatter.
     */
    const modifiedFilenames = getModifiedFilenames(
      gitDirectoryParent,
      options.base,
      options.head,
    )
      .filter(selectedFormatter.hasSupportedFileExtension)
      .filter(generateFilesWhitelistPredicate(options.filesWhitelist))
      .filter(selectedFormatter.generateIgnoreFilePredicate(workingDirectory));
    /**
     * Report on the the total number of relevant files.
     */
    const totalFiles = modifiedFilenames.length;
    callbacks.onModifiedFilesDetected(modifiedFilenames);
    /**
     * Process each file synchronously.
     */
    modifiedFilenames.forEach((filename, index) => {
      callbacks.onBegunProcessingFile(filename, index, totalFiles);
      /**
       * Read the modified file contents and resolve the relevant formatter.
       */
      const modifiedFile = new ModifiedFile({
        fullPath: join(gitDirectoryParent, filename),
        gitDirectoryParent,
        base: options.base,
        head: options.head,
        selectedFormatter,
      });
      /**
       * To avoid unnecessary issues with 100% valid files producing issues when parts
       * of them are reformatted in isolation, we first check the whole file to see if
       * it is already formatted. This could also allow us to skip unnecessary git diff
       * analysis work.
       */
      if (modifiedFile.isAlreadyFormatted()) {
        return callbacks.onFinishedProcessingFile(
          filename,
          index,
          'NOT_UPDATED',
        );
      }
      /**
       * Calculate what character ranges have been affected in the modified file.
       * If any of the analysis threw an error for any reason, it will be returned
       * from the method so we can handle it here.
       */
      const { err } = modifiedFile.calculateModifiedCharacterRanges();
      if (err) {
        if (err.message === NO_LINE_CHANGE_DATA_ERROR) {
          return callbacks.onFinishedProcessingFile(
            filename,
            index,
            'NOT_UPDATED',
          );
        }
        /**
         * Unexpected error, bubble up to the main onError handler
         */
        throw err;
      }
      /**
       * "CHECK ONLY MODE"
       */
      if (options.checkOnly) {
        if (!modifiedFile.hasValidFormattingForCharacterRanges()) {
          return callbacks.onFinishedProcessingFile(
            filename,
            index,
            'INVALID_FORMATTING',
          );
        } else {
          return callbacks.onFinishedProcessingFile(
            filename,
            index,
            'NOT_UPDATED',
          );
        }
      }
      /**
       * "FORMAT MODE"
       */
      modifiedFile.formatCharacterRangesWithinContents();
      if (!modifiedFile.shouldContentsBeUpdatedOnDisk()) {
        return callbacks.onFinishedProcessingFile(
          filename,
          index,
          'NOT_UPDATED',
        );
      }
      /**
       * Write the file back to disk and report.
       */
      modifiedFile.updateFileOnDisk();
      return callbacks.onFinishedProcessingFile(filename, index, 'UPDATED');
    });
    /**
     * Report that all files have finished processing.
     */
    callbacks.onComplete(totalFiles);
  } catch (err) {
    /**
     * Report and unhandled errors.
     */
    callbacks.onError(err);
  }
}
