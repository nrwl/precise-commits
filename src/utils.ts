import * as execa from 'execa';

export interface LineChanges {
  start: number;
  noOfLines: number;
}

export interface LineChangeData {
  removals: LineChanges[];
  additions: LineChanges[];
}

export interface CharacterRange {
  rangeStart: number;
  rangeEnd: number;
}

export const NO_LINE_CHANGE_DATA_ERROR =
  'No line change data could be detected';

/**
 * Addition `start` number included in the range,
 * removal `start` is the line before
 */
export function extractLineChangeData(diffData: string) {
  const lineChanges = diffData.match(/@@.*@@/g);
  if (!lineChanges) {
    throw new Error(NO_LINE_CHANGE_DATA_ERROR);
  }
  const lineChangeData: {
    removals: LineChanges[];
    additions: LineChanges[];
  } = {
    removals: [],
    additions: [],
  };
  lineChanges.forEach(lineChange => {
    const d = lineChange.match(/(@@ )(-\d+,?\d*)( )(\+\d+,?\d*)( @@)/);
    if (!d) {
      throw new Error('The detected line change data could be not be parsed');
    }
    const [removalStartLine, noOfLinesRemoved = 1] = d[2].split(',');
    const [additionStartLine, noOfLinesAdded = 1] = d[4].split(',');
    if (noOfLinesRemoved > 0) {
      lineChangeData.removals.push({
        start: +removalStartLine.replace('-', ''),
        noOfLines: +noOfLinesRemoved,
      });
    }
    if (noOfLinesAdded > 0) {
      lineChangeData.additions.push({
        start: +additionStartLine.replace('+', ''),
        noOfLines: +noOfLinesAdded,
      });
    }
  });
  return lineChangeData;
}

function getTextBeforeLineIndex(linesInFile: string[], index: number): string {
  return linesInFile.slice(0, index).join('\n');
}

export function calculateCharacterRangesFromLineChanges(
  lineChangeData: LineChangeData,
  fileContents: string,
): CharacterRange[] {
  const linesInFile = fileContents.split('\n');
  return lineChangeData.additions.map(added => {
    /**
     * Calculate the character to start at
     */
    const startLineNumberIndex = added.start - 1;
    const textBeforeStartOfStartLine = getTextBeforeLineIndex(
      linesInFile,
      startLineNumberIndex,
    );
    const rangeStart = textBeforeStartOfStartLine.length;
    /**
     * Calculate the character to end at
     */
    const endLineNumberIndex = startLineNumberIndex + added.noOfLines - 1;
    const textBeforeEndOfEndLine = getTextBeforeLineIndex(
      linesInFile,
      endLineNumberIndex + 1,
    );
    const rangeEnd = textBeforeEndOfEndLine.length;

    return {
      rangeStart,
      rangeEnd,
    };
  });
}

export function runCommandSync(
  command: string,
  args: string[],
  workingDirectory = process.cwd(),
) {
  return execa.sync(command, args, { cwd: workingDirectory });
}

export function generateFilesWhitelistPredicate(
  filesWhitelist: string[] | null,
): (file: string) => boolean {
  if (!filesWhitelist) {
    return () => true;
  }
  return file => filesWhitelist.includes(file);
}
