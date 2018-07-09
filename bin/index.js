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
    config.whitelist.forEach(() => {
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
    process.exit(1);
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
    process.exit(1);
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

const jsonOutput = {
  cliOutput: [],
};

if (config.json) {
  jsonOutput.resolvedOptions = options;
}

const primarySpinner = ora(` Running ${LIBRARY_NAME}...`);
const modifiedFilesSpinner = ora(' Detecting modified files from git...');
const spinnersByFilename = {};

let shouldErrorOut = false;

function exit(exitCode = 0) {
  if (config.json) {
    console.log(JSON.stringify(jsonOutput, null, 3));
  }
  return process.exit(exitCode);
}

main(process.cwd(), options, {
  onInit() {
    primarySpinner.start();
    modifiedFilesSpinner.start();
  },
  onModifiedFilesDetected(modifiedFilenames) {
    if (!modifiedFilenames || !modifiedFilenames.length) {
      return;
    }
    const output = ` ${LIBRARY_NAME}: ${
      modifiedFilenames.length
    } modified file(s) found`;
    if (config.json) {
      jsonOutput.cliOutput.push(output);
      jsonOutput.modifiedFilenames = modifiedFilenames;
    } else {
      modifiedFilesSpinner.succeed(output);
    }
  },
  onBegunProcessingFile(filename, index, totalFiles) {
    const output = ` [${index + 1}/${totalFiles}] Processing file: ${filename}`;
    if (config.json) {
      jsonOutput.cliOutput.push(output);
    } else {
      spinnersByFilename[filename] = ora()
        .start()
        .succeed(output);
    }
  },
  onFinishedProcessingFile(filename, index, status) {
    const spinner = spinnersByFilename[filename];
    switch (status) {
      case 'UPDATED': {
        const output = `       --> Updated formatting in: ${filename}`;
        if (config.json) {
          jsonOutput.cliOutput.push(output);
        } else {
          spinner.succeed(output);
        }
        return;
      }
      case 'NOT_UPDATED': {
        const output = `       --> No formatting changes required in: ${filename}`;
        if (config.json) {
          jsonOutput.cliOutput.push(output);
        } else {
          spinner.info(output);
        }
        return;
      }
      case 'INVALID_FORMATTING': {
        /**
         * If --check-only is passed as a CLI argument, the script will error out.
         */
        if (options.checkOnly) {
          shouldErrorOut = true;
        }
        const output = `       --> Invalid formatting detected in: ${filename}`;
        if (config.json) {
          jsonOutput.cliOutput.push(output);
        } else {
          spinner.fail(output);
        }
        return;
      }
    }
  },
  onError(err) {
    const output = ` ${LIBRARY_NAME}: An Error occurred\n`;
    if (config.json) {
      jsonOutput.cliOutput.push(output);
    } else {
      modifiedFilesSpinner.fail(output);
    }
    console.error(err);
    console.log('\n');
    primarySpinner.stop();
    return exit(1);
  },
  onComplete(totalFiles) {
    if (!totalFiles) {
      const output = ` ${LIBRARY_NAME}: No matching modified files detected.
    
  --> If you feel that one or more files should be showing up here, be sure to first check what file extensions prettier supports, and whether or not you have included those files in a .prettierignore file

        `;
      if (config.json) {
        jsonOutput.cliOutput.push(output);
      } else {
        modifiedFilesSpinner.info(output);
        primarySpinner.stop();
      }
      return exit(shouldErrorOut ? 1 : 0);
    }
    if (options.checkOnly) {
      const output = ' Checks complete 🎉';
      if (config.json) {
        jsonOutput.cliOutput.push(output);
      } else {
        primarySpinner.succeed(output);
      }
    } else {
      const output = ' Formatting complete 🎉';
      if (config.json) {
        jsonOutput.cliOutput.push(output);
      } else {
        primarySpinner.succeed(output);
      }
    }
    return exit(shouldErrorOut ? 1 : 0);
  },
});
