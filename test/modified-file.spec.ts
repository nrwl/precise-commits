import { readFileSync } from 'fs';

import { TestBed, readFixtures } from './test-utils';

import { ModifiedFile } from '../src/modified-file';

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
        const modifiedFile = new ModifiedFile(
          tmpFile.path,
          tmpFile.initialCommitSHA,
          tmpFile.updatedCommitSHA,
        );
        expect(modifiedFile.isAlreadyFormatted()).toEqual(false);
      });
    });
  });
});
