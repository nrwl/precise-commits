import { readFileSync } from 'fs';

import { TestBed, readFixtures } from './test-utils';

import { main } from '../src/index';

const fixtures = readFixtures();
let testBed: TestBed;

describe('prettier-lines', () => {
  describe('main()', function() {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        main(tmpFile.directoryPath, { checkOnly: false });
        const formatted = readFileSync(tmpFile.path, 'utf8');
        expect(formatted).toMatchSnapshot();
      });
    });
  });
});
