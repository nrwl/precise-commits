import { readFixtures } from './test-utils';
import {
  resolvePrettierConfigForFile,
  formatRangesWithinContents,
} from '../src/prettier';

const fixtures = readFixtures();

describe('prettier', () => {
  describe('resolvePrettierConfigForFile()', () => {
    fixtures.forEach(
      ({ fixtureName, fileExtension, initialContents, stagedContents }) => {
        it(fixtureName, () => {
          const prettierConfig = resolvePrettierConfigForFile(
            `./test/fixtures/${fixtureName}/initial${fileExtension}`,
          );
          expect(prettierConfig).toMatchSnapshot();
        });
      },
    );
  });

  describe('formatRangesWithinContents()', () => {
    it('should format the given ranges of the given source', () => {
      const contents = `
        var a = 1
        var b = 2
        var c = 3
      `;
      const formatted = formatRangesWithinContents(
        [{ rangeStart: 0, rangeEnd: 10 }, { rangeStart: 46, rangeEnd: 62 }],
        contents,
        {
          semi: true,
        },
      );
      expect(formatted).toEqual(`
        var a = 1;
        var b = 2
        var c = 3;
      `);
    });
  });
});
