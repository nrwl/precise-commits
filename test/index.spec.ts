import { readFileSync } from 'fs';

import { TestBed, readFixtures, mergeOptionsForTmpFile } from './test-utils';

import { main } from '../src/index';

const LIBRARY_NAME = require('../package.json').name;
const fixtures = readFixtures();
let testBed: TestBed;

describe(LIBRARY_NAME, () => {
  describe('main()', () => {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, done => {
        expect.assertions(1);
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        const options = mergeOptionsForTmpFile(
          { checkOnly: false, filesWhitelist: null },
          tmpFile,
        );
        main(tmpFile.directoryPath, options, {
          onInit() {},
          onBegunProcessingFile() {},
          onModifiedFilesDetected() {},
          onFinishedProcessingFile() {},
          onComplete() {
            const formatted = readFileSync(tmpFile.path, 'utf8');
            expect(formatted).toMatchSnapshot();
            done();
          },
          onError(err) {
            done.fail(err);
          },
        });
      });
    });
  });

  describe('main() - checkOnly: true', () => {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, done => {
        expect.assertions(1);
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        const options = mergeOptionsForTmpFile(
          { checkOnly: true, filesWhitelist: null },
          tmpFile,
        );
        main(tmpFile.directoryPath, options, {
          onInit() {},
          onBegunProcessingFile() {},
          onModifiedFilesDetected() {},
          onFinishedProcessingFile(_fn, _i, status) {
            expect(status).toEqual('INVALID_FORMATTING');
          },
          onComplete() {
            done();
          },
          onError(err) {
            done.fail(err);
          },
        });
      });
    });
  });
});
