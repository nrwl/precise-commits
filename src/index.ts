import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { getDiffForFile, getStagedModifiedFiles } from './git-utils';
import {
  extractLineChangeData,
  calculateCharacterRangesFromLineChanges,
} from './utils';
import {
  formatRangesWithinContents,
  resolvePrettierConfigForFile,
} from './prettier';

export interface Callbacks {
  onInit(workingDirectory: string): void;
  onModifiedFilesDetected(modifiedFilenames: string[]): void;
  onBegunProcessingFile(
    filename: string,
    index: number,
    totalFiles: number,
  ): void;
  onError(err: Error): void;
  onComplete(totalFiles: number): void;
}

/**
 * prettier-lines library
 */
export function main(
  workingDirectory: string,
  callbacks: Callbacks = {
    onInit() {},
    onModifiedFilesDetected() {},
    onBegunProcessingFile() {},
    onError() {},
    onComplete() {},
  },
) {
  try {
    callbacks.onInit(workingDirectory);

    const modifiedFilenames = getStagedModifiedFiles(workingDirectory);
    callbacks.onModifiedFilesDetected(modifiedFilenames);
    const totalFiles = modifiedFilenames.length;

    modifiedFilenames.forEach((filename, index) => {
      callbacks.onBegunProcessingFile(filename, index, totalFiles);

      const fullPath = join(workingDirectory, filename);
      const diff = getDiffForFile(fullPath);
      /**
       * Read the staged file contents
       */
      const fileContents = readFileSync(fullPath, 'utf8');
      /**
       * Extract line change data from the git diff results
       */
      const lineChangeData = extractLineChangeData(diff);
      /**
       * Convert the line change data into character data
       */
      const characterRanges = calculateCharacterRangesFromLineChanges(
        lineChangeData,
        fileContents,
      );
      /**
       * Run prettier on the file, multiple times if required, instructing it
       * to only focus on the calculated range(s)
       */
      const prettierConfig = resolvePrettierConfigForFile(fullPath);
      const formattedFileContents = formatRangesWithinContents(
        characterRanges,
        fileContents,
        prettierConfig,
      );
      if (formattedFileContents === fileContents) {
        return;
      }
      /**
       * Write the file back to disk
       */
      writeFileSync(fullPath, formattedFileContents);
    });

    callbacks.onComplete(totalFiles);
  } catch (err) {
    callbacks.onError(err);
  }
}
