import { sync as findUpSync } from 'find-up';
import { dirname } from 'path';

import { runCommandSync } from './utils';
import {
  hasPrettierSupportedFileExtension,
  generatePrettierIgnorePredicate,
} from './prettier';

interface DiffIndexFile {
  diffFilterChar: string;
  filename: string;
}

export function resolveNearestGitDirectory(workingDirectory: string) {
  return findUpSync('.git', { cwd: workingDirectory });
}

export function getDiffForFile(filename: string): string {
  return runCommandSync(
    'git',
    ['diff', '--unified=0', '--cached', filename],
    dirname(filename),
  ).stdout;
}

/**
 * NOTE: We are only explicitly testing "Modified" and "Added" files for now...
 * ----------------------------------------------------------------------
 *
 * Output of `git diff-index --help`:
 *
 * --diff-filter=[(A|C|D|M|R|T|U|X|B)...[*]]
      Select only files that are Added (A), Copied (C), Deleted (D), Modified (M), Renamed (R), have
      their type (i.e. regular file, symlink, submodule, ...) changed (T), are Unmerged (U), are
      Unknown (X), or have had their pairing Broken (B). Any combination of the filter characters
      (including none) can be used. When * (All-or-none) is added to the combination, all paths are
      selected if there is any file that matches other criteria in the comparison; if there is no
      file that matches other criteria, nothing is selected.

      Also, these upper-case letters can be downcased to exclude. E.g.  --diff-filter=ad excludes
      added and deleted paths.
 *
 */
const DIFF_INDEX_FILTER = 'ACDMRTUXB';
const SPECIAL_EMPTY_TREE_COMMIT_HASH =
  '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

export function getStagedModifiedFiles(workingDirectory: string): string[] {
  const gitDirectoryPath = resolveNearestGitDirectory(workingDirectory);
  if (!gitDirectoryPath) {
    throw new Error('No .git directory found');
  }
  const gitDirectoryParent = dirname(gitDirectoryPath);
  let head: string = '';
  try {
    head = runCommandSync(
      'git',
      ['rev-parse', '--verify', 'HEAD'],
      gitDirectoryParent,
    ).stdout.replace('\n', '');
  } catch (err) {
    /**
     * If there has never been a commit before, there will be no HEAD to compare
     * to. Use the special empty tree hash value instead:
     * https://stackoverflow.com/questions/9765453/is-gits-semi-secret-empty-tree-object-reliable-and-why-is-there-not-a-symbolic
     */
    if (err.message.includes(`fatal: Needed a single revision`)) {
      head = SPECIAL_EMPTY_TREE_COMMIT_HASH;
    } else {
      throw err;
    }
  }

  const diffIndexOutput = runCommandSync(
    'git',
    [
      'diff-index',
      '--cached',
      '--name-status',
      `--diff-filter=${DIFF_INDEX_FILTER}`,
      head,
    ],
    gitDirectoryParent,
  ).stdout;
  const files = parseDiffIndexOutput(diffIndexOutput);
  /**
   * We fundamentally check whether or not the file extensions are supported by prettier,
   * and that the user has not chosen to ignore them via a .prettierignore file.
   */
  return files
    .map(r => r.filename)
    .filter(hasPrettierSupportedFileExtension)
    .filter(generatePrettierIgnorePredicate(workingDirectory));
}

function parseDiffIndexOutput(stdout: string): DiffIndexFile[] {
  const lines = stdout.split('\n');
  return lines.filter(Boolean).map(line => {
    const parts = line.split('\t');
    return {
      filename: parts[1],
      diffFilterChar: parts[0],
    };
  });
}
