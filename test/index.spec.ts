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
        main(tmpFile.directoryPath, {
          checkOnly: false,
          filesWhitelist: null,
          sha1: null,
          sha2: null,
        });
        const formatted = readFileSync(tmpFile.path, 'utf8');
        expect(formatted).toMatchSnapshot();
      });
    });
  });

  describe('main() - checkOnly: true', function() {
    beforeAll(() => {
      testBed = new TestBed();
    });

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, done => {
        expect.assertions(1);
        testBed.prepareFixtureInTmpDirectory(fixture);
        const tmpFile = testBed.getTmpFileForFixture(fixture);
        main(
          tmpFile.directoryPath,
          { checkOnly: true, filesWhitelist: null, sha1: null, sha2: null },
          {
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
          },
        );
      });
    });
  });
});
