#!/usr/bin/env node

'use strict';

/**
 * CLI output
 */
const ora = require('ora');
const mri = require('mri');
const glob = require('glob');

const LIBRARY_NAME = require('../package.json').name;
const main = require('../lib').main;

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
      }"`
    );
    return process.exit(1);
  }
}

/**
 * If the user specifies at least one SHA, perform some validation and
 * apply some defaults
 */
if (config.base || config.head) {
  if (!config.base) {
    console.error(
      `Error: When giving a value of --head, you must also give a value for --base`
    );
    return process.exit(1);
  }
  if (!config.head) {
    /**
     * If the user only specified `--base`, set the value of `--head` to be "HEAD"
     */
    config.head = 'HEAD';
  }
}

const options = {
  checkOnly: config['check-only'] || false,
  filesWhitelist,
  base: config.base || null,
  head: config.head || null,
  formatter: config.formatter || 'prettier',
};

const primarySpinner = ora(` Running ${LIBRARY_NAME}...`);
const modifiedFilesSpinner = ora(' Detecting modified files from git...');
const spinnersByFilename = {};

let shouldErrorOut = false;

main(process.cwd(), options, {
  onInit(workingDirectory) {
    primarySpinner.start();
    modifiedFilesSpinner.start();
  },
  onModifiedFilesDetected(modifiedFilenames) {
    if (!modifiedFilenames || !modifiedFilenames.length) {
      return;
    }
    modifiedFilesSpinner.succeed(
      ` ${LIBRARY_NAME}: ${modifiedFilenames.length} modified file(s) found`
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
          `       --> No formatting changes required in: ${filename}`
        );
        break;
      case 'INVALID_FORMATTING':
        /**
         * If --check-only is passed as a CLI argument, the script will error out.
         */
        if (options.checkOnly) {
          shouldErrorOut = true;
        }
        spinner.fail(`       --> Invalid formatting detected in: ${filename}`);
        break;
    }
  },
  onError(err) {
    modifiedFilesSpinner.fail(` ${LIBRARY_NAME}: An Error occurred\n`);
    console.error(err);
    console.log('\n');
    primarySpinner.stop();
    return process.exit(1);
  },
  onComplete(totalFiles) {
    if (!totalFiles) {
      modifiedFilesSpinner.info(` ${LIBRARY_NAME}: No matching modified files detected.
        
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
