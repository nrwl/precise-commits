import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { extname } from 'path';

import { runCommandSync } from '../src/utils';

export interface Fixture {
  fixtureName: string;
  fileExtension: string;
  /**
   * Optional, there will not be an `initial` file if we are testing
   * a brand new file in the git index
   */
  initialContents: string | null;
  /**
   * The file as it stands after `git add`, but before formatting
   */
  stagedContents: string;
  /**
   * Optional prettier config overrides specified inline in the
   * fixture directory
   */
  customPrettierConfig: CustomPrettierConfig | null;
}

interface CustomPrettierConfig {
  filename: string;
  contents: string;
}

export function readFixtures(): Fixture[] {
  const fixtures = readdirSync('./test/fixtures');
  return fixtures.map(name => {
    const files = readdirSync(`./test/fixtures/${name}`);
    /**
     * Could have any of the file extensions supported by prettier
     */
    const initialContentsFileName = files.find(f => !!f.match(/initial/));
    const stagedContentsFileName = files.find(f => !!f.match(/staged/));
    const prettierConfigFileName = files.find(f => !!f.match(/prettierrc/));

    if (!stagedContentsFileName) {
      throw new Error(
        `"staged" file missing for fixture: ./test/fixtures/${name}`,
      );
    }

    return {
      fixtureName: name,
      fileExtension: extname(stagedContentsFileName),
      initialContents: !initialContentsFileName
        ? null
        : readFileSync(
            `./test/fixtures/${name}/${initialContentsFileName}`,
            'utf8',
          ),
      stagedContents: readFileSync(
        `./test/fixtures/${name}/${stagedContentsFileName}`,
        'utf8',
      ),
      customPrettierConfig: !prettierConfigFileName
        ? null
        : <CustomPrettierConfig>{
            filename: prettierConfigFileName,
            contents: readFileSync(
              `./test/fixtures/${name}/${prettierConfigFileName}`,
              'utf8',
            ),
          },
    };
  });
}

export const TMP_DIRECTORY_PATH = process.cwd() + '/tmp';

let tmpFileExtension = '.js';
function setTmpFileExtension(extension: string) {
  tmpFileExtension = extension;
}

function getTmpFileName() {
  return `tmp${tmpFileExtension}`;
}

export function getTmpFilePath() {
  return `${TMP_DIRECTORY_PATH}/${getTmpFileName()}`;
}

export function destroyTmpDirectory() {
  runCommandSync('rm', ['-rf', TMP_DIRECTORY_PATH]);
}

export function createTmpDirectoryAndInitialiseGit() {
  createTmpDirectory();
  initialiseGit();
}

export function getTmpFileContents() {
  return readFileSync(getTmpFilePath(), 'utf8');
}

export function prepareFixtureInTmpDirectory({
  fixtureName,
  fileExtension,
  initialContents,
  stagedContents,
  customPrettierConfig,
}: Fixture): void {
  applyInitialAndStagedToTmpFile(
    initialContents,
    stagedContents,
    fileExtension,
  );
  applyCustomPrettierConfig(customPrettierConfig);
}

function applyInitialAndStagedToTmpFile(
  initialContents: string,
  stagedContents: string,
  fileExtension: string,
) {
  setTmpFileExtension(fileExtension);
  /**
   * If we editing an existing `initial` file, we need to first create
   * it and commit it
   */
  if (initialContents) {
    createAndCommitTmpFileForContents(initialContents);
  }
  stageGivenChangesToTmpFile(stagedContents);
}

function applyCustomPrettierConfig(
  customPrettierConfig: CustomPrettierConfig | null,
) {
  if (!customPrettierConfig) {
    return;
  }
  writeFileSync(
    TMP_DIRECTORY_PATH + '/' + customPrettierConfig.filename,
    customPrettierConfig.contents,
  );
}

function createTmpDirectory() {
  destroyTmpDirectory();
  runCommandSync('mkdir', [TMP_DIRECTORY_PATH]);
}

function initialiseGit() {
  runCommandSync('rm', ['-rf', '.git'], TMP_DIRECTORY_PATH);
  runCommandSync('git', ['init'], TMP_DIRECTORY_PATH);
}

function createAndGitAddFile({ filename, content }) {
  writeFileSync(TMP_DIRECTORY_PATH + '/' + filename, content);
  runCommandSync('git', ['add', filename], TMP_DIRECTORY_PATH);
}

function createAndCommitTmpFileForContents(contents: string) {
  const opts = {
    filename: getTmpFileName(),
    content: contents,
  };
  createAndGitAddFile(opts);
  runCommandSync(
    'git',
    ['commit', '-m', `adding ${opts.filename}`],
    TMP_DIRECTORY_PATH,
  );
}

function stageGivenChangesToTmpFile(changedContent: string) {
  const opts = {
    filename: getTmpFileName(),
    content: changedContent,
  };
  createAndGitAddFile(opts);
}
