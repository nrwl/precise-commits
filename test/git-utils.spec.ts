import { join } from 'path';

import {
  TMP_DIRECTORY_PATH,
  destroyTmpDirectory,
  readFixtures,
  getTmpFilePath,
  createTmpDirectoryAndInitialiseGit,
  prepareFixtureInTmpDirectory,
} from './test-utils';
import {
  getDiffForFile,
  resolveNearestGitDirectory,
  getStagedModifiedFiles,
} from '../src/git-utils';

const fixtures = readFixtures();

describe('git-utils', () => {
  describe('resolveNearestGitDirectory()', () => {
    beforeEach(createTmpDirectoryAndInitialiseGit);

    it('should find the nearest .git directory to the given file by traversing up the parent hierarchy', () => {
      /**
       * This current spec file should use the repo's root .git
       */
      expect(resolveNearestGitDirectory(__dirname)).toEqual(
        join(__dirname, '../.git'),
      );
      /**
       * The tmp file should resolve to its own .git directory within the tmp directory
       */
      expect(resolveNearestGitDirectory(TMP_DIRECTORY_PATH)).toEqual(
        join(TMP_DIRECTORY_PATH, '.git'),
      );
    });

    afterEach(destroyTmpDirectory);
  });

  describe('getDiffForFile()', () => {
    beforeEach(createTmpDirectoryAndInitialiseGit);

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        prepareFixtureInTmpDirectory(fixture);
        const diff = getDiffForFile(getTmpFilePath());
        expect(diff).toMatchSnapshot();
      });
    });

    afterEach(destroyTmpDirectory);
  });

  describe('getStagedModifiedFiles()', () => {
    beforeEach(createTmpDirectoryAndInitialiseGit);

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        prepareFixtureInTmpDirectory(fixture);
        const fileNames = getStagedModifiedFiles(TMP_DIRECTORY_PATH);
        expect(fileNames).toEqual([`tmp${fixture.fileExtension}`]);
      });
    });

    afterEach(destroyTmpDirectory);
  });
});
