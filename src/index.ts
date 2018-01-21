import { join } from 'path';

import { getRelevantModifiedFiles } from './git-utils';
import { NO_LINE_CHANGE_DATA_ERROR } from './utils';
import { ModifiedFile } from './modified-file';
import { preciseFormatterPrettier } from './precise-formatters/prettier';

export type ProcessingStatus = 'NOT_UPDATED' | 'UPDATED' | 'INVALID_FORMATTING';

export interface AdditionalOptions {
  checkOnly: boolean;
  filesWhitelist: string[] | null;
  sha1: string | null;
  sha2: string | null;
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

function applyDefaults(options: AdditionalOptions): AdditionalOptions {
  options = options || {};
  options.filesWhitelist = options.filesWhitelist || null;
  options.sha1 = options.sha1 || null;
  options.sha2 = options.sha2 || null;
  options.checkOnly = !!options.checkOnly;
  return options;
}

/**
 * prettier-lines library
 */
export function main(
  workingDirectory: string,
  options: AdditionalOptions,
  callbacks: Callbacks = {
    onInit() {},
    onModifiedFilesDetected() {},
    onBegunProcessingFile() {},
    onFinishedProcessingFile() {},
    onError() {},
    onComplete() {},
  },
) {
  /**
   * Apply default options
   */
  const { checkOnly, filesWhitelist, sha1, sha2 } = applyDefaults(options);
  try {
    callbacks.onInit(workingDirectory);

    const modifiedFilenames = getRelevantModifiedFiles(
      workingDirectory,
      filesWhitelist,
      sha1,
      sha2,
      preciseFormatterPrettier.hasSupportedFileExtension,
      preciseFormatterPrettier.generateIgnoreFilePredicate,
    );
    const totalFiles = modifiedFilenames.length;
    callbacks.onModifiedFilesDetected(modifiedFilenames);

    modifiedFilenames.forEach((filename, index) => {
      callbacks.onBegunProcessingFile(filename, index, totalFiles);
      /**
       * Read the modified file contents and resolve the relevant formatter.
       */
      const modifiedFile = new ModifiedFile({
        fullPath: join(workingDirectory, filename),
        sha1,
        sha2,
        preciseFormatter: preciseFormatterPrettier,
      });
      /**
       * To avoid unnecessary issues with 100% valid files producing issues when parts
       * of them are reformatted in isolation, we first check the whole file to see if
       * it is already formatted. This also allows us to skip unnecessary git diff
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
       * CHECK ONLY
       */
      if (checkOnly) {
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
       * FORMAT
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
       * Write the file back to disk
       */
      modifiedFile.updateFileOnDisk();
      return callbacks.onFinishedProcessingFile(filename, index, 'UPDATED');
    });

    callbacks.onComplete(totalFiles);
  } catch (err) {
    callbacks.onError(err);
  }
}
