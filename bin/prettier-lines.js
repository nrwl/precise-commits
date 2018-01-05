#!/usr/bin/env node

'use strict';

/**
 * prettier-lines CLI output
 */
const ora = require('ora');

const prettierLines = require('../lib').main;

const primarySpinner = ora(' Running prettier-lines...');
const stagedFileSpinner = ora(' Detecting staged files...');

prettierLines(process.cwd(), {
  onInit(workingDirectory) {
    primarySpinner.start();
    stagedFileSpinner.start();
  },
  onModifiedFilesDetected(modifiedFilenames) {
    if (!modifiedFilenames || !modifiedFilenames.length) {
      return;
    }
    stagedFileSpinner.succeed(
      ` ${modifiedFilenames.length} staged file(s) found`,
    );
  },
  onBegunProcessingFile(filename, index, totalFiles) {
    const individualFileSpinner = ora().start(
      ` [${index + 1}/${totalFiles}] Processing file: ${filename}`,
    );
    individualFileSpinner.succeed();
  },
  onError(err) {
    stagedFileSpinner.fail(' prettier-lines: An Error occurred\n');
    console.error(err);
    console.log('\n');
    primarySpinner.stop();
    return process.exit(1);
  },
  onComplete(totalFiles) {
    if (!totalFiles) {
      stagedFileSpinner.info(
        ` prettier-lines: No staged files detected.
        
  --> If you feel that one or more files should be showing up here, be sure to first check what file extensions prettier supports, and whether or not you have included those files in a .prettierignore file

        `,
      );
      primarySpinner.stop();
      return process.exit(0);
    }
    primarySpinner.succeed(' Formatting complete 🎉');
  },
});
