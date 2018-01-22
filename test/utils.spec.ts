import { TestBed, readFixtures } from './test-utils';
import {
  getDiffForFile,
  resolveNearestGitDirectoryParent,
} from '../src/git-utils';
import {
  extractLineChangeData,
  calculateCharacterRangesFromLineChanges,
} from '../src/utils';

const fixtures = readFixtures();
let testBed: TestBed;

describe('utils', () => {
  describe('extractLineChangeData()', () => {
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
        const lineChangeData = extractLineChangeData(diff);
        expect(lineChangeData).toMatchSnapshot();
      });
    });
  });

  describe('calculateCharacterRangesFromLineChanges()', () => {
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
        const lineChangeData = extractLineChangeData(diff);
        const characterRanges = calculateCharacterRangesFromLineChanges(
          lineChangeData,
          fixture.stagedContents,
        );
        expect(characterRanges).toMatchSnapshot();
      });
    });
  });
});
