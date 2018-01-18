#!/usr/bin/env node

'use strict';

/**
 * prettier-lines CLI output
 */
const ora = require('ora');
const mri = require('mri');
const glob = require('glob');

const prettierLines = require('../lib').main;
const config = mri(process.argv.slice(2));

/**
 * If the user provided one or more glob patterns to match against, ensure that there are
 * applicable files available
 */
let filesWhitelist = null;
if (config.whitelist) {
  filesWhitelist = [];
  if (Array.isArray(config.whitelist)) {
    config.whitelist.forEach(pattern => {
      filesWhitelist = [...filesWhitelist, ...glob.sync(config.whitelist)];
    });
  } else {
    filesWhitelist = glob.sync(config.whitelist);
  }
  if (!filesWhitelist || !filesWhitelist.length) {
    console.error(
      `Error: No files match the glob pattern(s) you provided for --whitelist -> "${
        config.pattern
      }"`,
    );
    return process.exit(1);
  }
}

/**
 * If the user specifies at least one SHA, make sure they provide two
 */
if (config.sha1 || config.sha2) {
  if (!(config.sha1 && config.sha2)) {
    console.error(
      `Error: When filtering between commit SHAs you must provide both --sha1 and --sha2`,
    );
    return process.exit(1);
  }
}

const options = {
  checkOnly: config['check-only'] || false,
  filesWhitelist,
  sha1: config.sha1 || null,
  sha2: config.sha2 || null,
};

const primarySpinner = ora(' Running prettier-lines...');
const modifiedFilesSpinner = ora(' Detecting modified files from git...');
const spinnersByFilename = {};

let shouldErrorOut = false;

prettierLines(process.cwd(), options, {
  onInit(workingDirectory) {
    primarySpinner.start();
    modifiedFilesSpinner.start();
  },
  onModifiedFilesDetected(modifiedFilenames) {
    if (!modifiedFilenames || !modifiedFilenames.length) {
      return;
    }
    modifiedFilesSpinner.succeed(
      ` ${modifiedFilenames.length} modified file(s) found`,
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
        spinner.fail(`       --> Invalid formatting detected in: ${filename}`);
        break;
    }
  },
  onError(err) {
    modifiedFilesSpinner.fail(' prettier-lines: An Error occurred\n');
    console.error(err);
    console.log('\n');
    primarySpinner.stop();
    return process.exit(1);
  },
  onComplete(totalFiles) {
    if (!totalFiles) {
      modifiedFilesSpinner.info(` prettier-lines: No matching modified files detected.
        
  --> If you feel that one or more files should be showing up here, be sure to first check what file extensions prettier supports, and whether or not you have included those files in a .prettierignore file

        `);
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
