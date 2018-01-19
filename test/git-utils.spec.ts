import { join } from 'path';

import { TestBed, readFixtures } from './test-utils';
import {
  getDiffForFile,
  resolveNearestGitDirectory,
  getRelevantModifiedFiles,
} from '../src/git-utils';

const fixtures = readFixtures();
let testBed: TestBed;

describe('git-utils', () => {
  describe('resolveNearestGitDirectory()', () => {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        /**
         * The tmpFile should resolve to its own .git directory
         */
        expect(resolveNearestGitDirectory(tmpFile.directoryPath)).toEqual(
          join(tmpFile.directoryPath, '.git'),
        );
      });
    });

    it(`should resolve the overall project's .git directory for this spec file`, () => {
      expect(resolveNearestGitDirectory(__dirname)).toEqual(
        join(__dirname, '../.git'),
      );
    });
  });

  describe('getDiffForFile()', () => {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        const diff = getDiffForFile(
          tmpFile.path,
          tmpFile.initialCommitSHA,
          tmpFile.updatedCommitSHA,
        );
        expect(diff).toMatchSnapshot();
      });
    });
  });

  describe('getRelevantModifiedFiles()', () => {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        const fileNames = getRelevantModifiedFiles(
          tmpFile.directoryPath,
          null,
          tmpFile.initialCommitSHA,
          tmpFile.updatedCommitSHA,
        );
        expect(fileNames).toEqual([`${tmpFile.filename}`]);
      });
    });
  });
});
