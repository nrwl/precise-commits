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

class TmpFile {
  name: string;
  filename: string;
  directoryPath: string;
  initialContents?: string;
  stagedContents: string;
  path: string;
}

export class TestBed {
  private static readonly TMP_DIRECTORY_PATH = `${process.cwd()}/tmp`;
  private TEST_BED_DIRECTORY_PATH: string;
  private fixtureToTmpFile = new Map<Fixture, TmpFile>();

  constructor(private testBedName: string) {
    this.TEST_BED_DIRECTORY_PATH = `${
      TestBed.TMP_DIRECTORY_PATH
    }/${testBedName}`;
    runCommandSync('mkdir', [`./${testBedName}`], TestBed.TMP_DIRECTORY_PATH);
  }

  getTmpFileForFixture(fixture: Fixture): TmpFile {
    return this.fixtureToTmpFile.get(fixture);
  }

  prepareFixtureInTmpDirectory(fixture: Fixture): void {
    /**
     * Create and cache a TmpFile for the given Fixture
     */
    const tmpFile = this.createTmpFileForFixture(fixture);
    this.fixtureToTmpFile.set(fixture, tmpFile);
    /**
     * Initialise a .git directory for the fixture
     */
    runCommandSync('mkdir', ['-p', tmpFile.name], this.TEST_BED_DIRECTORY_PATH);
    runCommandSync('git', ['init'], tmpFile.directoryPath);
    /**
     * Apply the two different file contents to the TmpFile
     */
    this.applyInitialAndStagedContentsOnDisk(tmpFile);
    /**
     * Apply any custom prettier config if present
     */
    this.applyCustomPrettierConfig(tmpFile, fixture.customPrettierConfig);
  }

  private applyInitialAndStagedContentsOnDisk(tmpFile: TmpFile): void {
    /**
     * If we editing an existing `initial` file, we need to first create
     * it and commit it
     */
    if (tmpFile.initialContents) {
      this.createAndCommitTmpFileOnDisk(tmpFile);
    }
    this.stageGivenChangesToTmpFileOnDisk(tmpFile);
  }

  private createTmpFileForFixture(fixture: Fixture): TmpFile {
    const name = fixture.fixtureName;
    const filename = `${name}${fixture.fileExtension}`;
    const directoryPath = `${this.TEST_BED_DIRECTORY_PATH}/${name}`;
    return {
      name,
      filename,
      directoryPath,
      path: `${directoryPath}/${filename}`,
      initialContents: fixture.initialContents,
      stagedContents: fixture.stagedContents,
    };
  }

  private applyCustomPrettierConfig(
    tmpFile: TmpFile,
    customPrettierConfig: CustomPrettierConfig | null,
  ): void {
    if (!customPrettierConfig) {
      return;
    }
    writeFileSync(
      `${tmpFile.directoryPath}/${customPrettierConfig.filename}`,
      customPrettierConfig.contents,
    );
  }

  private createAndCommitTmpFileOnDisk(tmpFile: TmpFile): void {
    writeFileSync(tmpFile.path, tmpFile.initialContents);
    runCommandSync('git', ['add', tmpFile.path], tmpFile.directoryPath);
    runCommandSync(
      'git',
      ['commit', '-m', `adding initial contents for ${tmpFile.path}`],
      tmpFile.directoryPath,
    );
  }

  private stageGivenChangesToTmpFileOnDisk(tmpFile: TmpFile): void {
    writeFileSync(tmpFile.path, tmpFile.stagedContents);
    runCommandSync('git', ['add', tmpFile.path], tmpFile.directoryPath);
  }
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
