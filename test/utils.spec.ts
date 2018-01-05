import {
  TMP_DIRECTORY_PATH,
  destroyTmpDirectory,
  readFixtures,
  getTmpFilePath,
  createTmpDirectoryAndInitialiseGit,
  prepareFixtureInTmpDirectory,
} from './test-utils';
import { getDiffForFile } from '../src/git-utils';
import {
  extractLineChangeData,
  calculateCharacterRangesFromLineChanges,
} from '../src/utils';

const fixtures = readFixtures();

describe('utils', () => {
  describe('extractLineChangeData()', () => {
    beforeEach(createTmpDirectoryAndInitialiseGit);

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        prepareFixtureInTmpDirectory(fixture);
        const diff = getDiffForFile(getTmpFilePath());
        const lineChangeData = extractLineChangeData(diff);
        expect(lineChangeData).toMatchSnapshot();
      });
    });

    afterEach(destroyTmpDirectory);
  });

  describe('calculateCharacterRangesFromLineChanges()', () => {
    beforeEach(createTmpDirectoryAndInitialiseGit);

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        prepareFixtureInTmpDirectory(fixture);
        const diff = getDiffForFile(getTmpFilePath());
        const lineChangeData = extractLineChangeData(diff);
        const characterRanges = calculateCharacterRangesFromLineChanges(
          lineChangeData,
          fixture.stagedContents,
        );
        expect(characterRanges).toMatchSnapshot();
      });
    });

    afterEach(destroyTmpDirectory);
  });
});
