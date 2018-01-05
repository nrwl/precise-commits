import {
  TMP_DIRECTORY_PATH,
  destroyTmpDirectory,
  readFixtures,
  getTmpFileContents,
  createTmpDirectoryAndInitialiseGit,
  prepareFixtureInTmpDirectory,
} from './test-utils';

import { main } from '../src/index';

const fixtures = readFixtures();

describe('prettier-lines', () => {
  describe('main()', function() {
    beforeEach(createTmpDirectoryAndInitialiseGit);

    fixtures.forEach(fixture => {
      it(fixture.fixtureName, () => {
        prepareFixtureInTmpDirectory(fixture);
        main(TMP_DIRECTORY_PATH);
        const formatted = getTmpFileContents();
        expect(formatted).toMatchSnapshot();
      });
    });

    afterEach(destroyTmpDirectory);
  });
});
