#!/usr/bin/env node

'use strict';

/**
 * prettier-lines CLI output
 */
const ora = require('ora');
const mri = require('mri');

const prettierLines = require('../lib').main;

const primarySpinner = ora(' Running prettier-lines...');
const stagedFileSpinner = ora(' Detecting staged files...');
const spinnersByFilename = {};

const config = mri(process.argv.slice(2));
const options = {
  checkOnly: config['check-only'] || false,
};

let shouldErrorOut = false;

prettierLines(process.cwd(), options, {
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
    spinnersByFilename[filename] = ora()
      .start()
      .succeed(` [${index + 1}/${totalFiles}] Processing file: ${filename}`);
  },
  onFinishedProcessingFile(filename, index, status) {
    const spinner = spinnersByFilename[filename];
    switch (status) {
      case 'UPDATED':
        spinner.succeed(`       --> Updated formatting in: ${filename}`);
        break;
      case 'NOT_UPDATED':
        spinner.info(
          `       --> No formatting changes required in: ${filename}`,
        );
        break;
      case 'INVALID_FORMATTING':
        /**
         * If --check-only is passed as a CLI argument, the script will error out
         * just like prettier's own --list-different option
         */
        if (options.checkOnly) {
          shouldErrorOut = true;
        }
        spinner.info(`       --> Invalid formatting detected in: ${filename}`);
        break;
    }
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
      return process.exit(shouldErrorOut ? 1 : 0);
    }
    if (options.checkOnly) {
      primarySpinner.succeed(' Checks complete 🎉');
    } else {
      primarySpinner.succeed(' Formatting complete 🎉');
    }
    return process.exit(shouldErrorOut ? 1 : 0);
  },
});
