import { readFileSync } from 'fs';

import { TestBed, readFixtures } from './test-utils';

import { ModifiedFile } from '../src/modified-file';
import { preciseFormatterPrettier } from '../src/precise-formatters/prettier';

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
          sha1: tmpFile.initialCommitSHA,
          sha2: tmpFile.updatedCommitSHA,
          preciseFormatter: preciseFormatterPrettier,
        });
        expect(modifiedFile.isAlreadyFormatted()).toEqual(false);
      });
    });
  });
});
