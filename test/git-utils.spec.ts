import { join } from 'path';

import { TestBed, readFixtures } from './test-utils';
import {
  getDiffForFile,
  resolveNearestGitDirectoryParent,
  getModifiedFilenames,
} from '../src/git-utils';
import { preciseFormatterPrettier } from '../src/precise-formatters/prettier';

const fixtures = readFixtures();
let testBed: TestBed;

describe('git-utils', () => {
  describe('resolveNearestGitDirectoryParent()', () => {
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
        expect(resolveNearestGitDirectoryParent(tmpFile.directoryPath)).toEqual(
          tmpFile.directoryPath,
        );
      });
    });

    it(`should resolve the overall project's .git directory for this spec file`, () => {
      expect(resolveNearestGitDirectoryParent(__dirname)).toEqual(
        join(__dirname, '..'),
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
          resolveNearestGitDirectoryParent(tmpFile.directoryPath),
          tmpFile.path,
          tmpFile.initialCommitSHA,
          tmpFile.updatedCommitSHA,
        );
        expect(diff).toMatchSnapshot();
      });
    });
  });

  describe('getModifiedFilenames()', () => {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        const fileNames = getModifiedFilenames(
          resolveNearestGitDirectoryParent(tmpFile.directoryPath),
          tmpFile.initialCommitSHA,
          tmpFile.updatedCommitSHA,
        );
        expect(fileNames).toEqual([`${tmpFile.filename}`]);
      });
    });
  });
});
