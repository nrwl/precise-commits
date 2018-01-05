import { readFileSync } from 'fs';

import { TestBed, readFixtures } from './test-utils';

import { ModifiedFile } from '../src/modified-file';
import { preciseFormatterPrettier } from '../src/precise-formatters/prettier';
import { resolveNearestGitDirectoryParent } from '../src/git-utils';

const fixtures = readFixtures();
let testBed: TestBed;

describe('ModifiedFile', () => {
  describe('isAlreadyFormatted()', function() {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        const modifiedFile = new ModifiedFile({
          fullPath: tmpFile.path,
          gitDirectoryParent: resolveNearestGitDirectoryParent(
            tmpFile.directoryPath,
          ),
          base: tmpFile.initialCommitSHA,
          head: tmpFile.updatedCommitSHA,
          selectedFormatter: preciseFormatterPrettier,
        });
        expect(modifiedFile.isAlreadyFormatted()).toEqual(false);
      });
    });
  });
});
