<h1 align="center">Precise Commits</h1>

<p align="center">
    <a href="https://travis-ci.org/JamesHenry/precise-commits"><img src="https://img.shields.io/travis/JamesHenry/precise-commits.svg?style=flat-square" alt="Travis"/></a>
    <a href="https://github.com/JamesHenry/precise-commits/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/precise-commits.svg?style=flat-square" alt="GitHub license" /></a>
    <a href="https://www.npmjs.com/package/precise-commits"><img src="https://img.shields.io/npm/v/precise-commits.svg?style=flat-square" alt="NPM Version" /></a>
    <a href="https://www.npmjs.com/package/precise-commits"><img src="https://img.shields.io/npm/dt/precise-commits.svg?style=flat-square" alt="NPM Downloads" /></a>
    <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen friendly" /></a>
    <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square" alt="semantic-release" /></a>
</p>

<br>

# Why `precise-commits`?

🔎 It is simply **the most exact and least disruptive way** to add consistent code formatting (by [Prettier](https://prettier.io)) to an existing codebase.

✨ You only **reformat the exact code you have modified anyway** as part of your normal development!

| Tool                | Staged files | Existing commits | PR Build | Arbitrary commands | Precision                       |
| ------------------- | ------------ | ---------------- | -------- | ------------------ | ------------------------------- |
| **precise-commits** | ✅           | ✅               | ✅       | ❌                 | **Individual character ranges** |
| lint-staged         | ✅           | ❌               | ❌       | ✅                 | Entire File                     |
| pretty-quick        | ✅           | ❌               | ❌       | ❌                 | Entire File                     |

<br>

# Background

Implementing a new code-style in an existing codebase can be really tricky.

[Prettier](https://prettier.io) is an amazing automated code formatting tool, but that does not mean that introducing it into an existing codebase is trivial.

Regardless of how consistent the existing code-style might be, introducing [Prettier](https://prettier.io) will result in larger diffs, which:

1. Increases the complexity and review time burden of PRs on senior team members.
2. Potentially increases the amount of time it takes to complete a PR in the first place.
3. Can block concurrent work on the same codebase and/or result in nasty merge conflicts with outstanding feature branches.

Other tools, such as `lint-staged`, made an excellent first step towards mitigating the scope of the impact of the points above, by only running linters and formatters on files which have changed.

This is great for small codebases, in which the authors do not mind much that they are polluting the git history of the files they are touching, but **it is not enough**.

In large and enterprise codebases (particularly those organized as monorepos), the git history of each file is really important.

> If I make a change on line 10 of a 4000 line file, I shouldn't be forced to reformat all 4000s lines (thus making me the last git user to update all of them) as part of my PR.
>
> I should just need to reformat line 10.

This is where `precise-commits` comes in!

<br>

# Our ideal end-goal...

1. All developers on our team develop using consistent, automated formatting as they write their code.
   e.g. Running an IDE-based plugin, such as "vscode-prettier" with "format on save" enabled.

2. Each time they commit, a precommit hook is triggered to _ensure_ that the staged code is formatted consistently.

3. Each time a Pull Request opened on our remote repo, a build is triggered on a CI server, during which the formatting
   is checked to ensure that all the files touched for that PR were formatted consistently.

<br>

# How `precise-commits` helps us get there...

1. All developers on our team write their code as they always have.

2. Each time they commit, a precommit hook is triggered which will run `precise-commits` on the code and ensure that **the exact code they already modified** is formatted consistently. Any untouched existing code will not be mutated.

3. Each time a Pull Request opened on our remote repo, a build is triggered on a CI server, during which `precise-commits`
   runs to ensure that all the **committed lines of code** for that PR was formatted consistently.

<br>

...and after enough time has passed, **our codebase will be formatted consistently, despite us never having to disrupt our feature-building momentum!**

<br>

# How it works

Through analyzing your staged files (or any files modified between two given commit SHAs) `precise-commits` will work out exactly what lines and characters within those files have actually been changed or added.

It then uses this information to run [Prettier](https://prettier.io) in a very focused way, allowing it to only reformat what is relevant for your current work, and allowing you to keep your PRs small and explicit!

<br>

# Installation

`precise-commits` expects `prettier` to be available as a `peerDependency`, so you will need to install this yourself as a `devDependency` of your project.

```sh
npm install --save-dev prettier precise-commits
```

<br>

# Usage

It is intended that you will run `precise-commits` as a CLI, and it will automatically pick up on any of the standard [Prettier configuration files](https://prettier.io/docs/en/configuration) you may have in your project, including [`.prettierignore`](https://prettier.io/docs/en/ignore#ignoring-files) files.

## 1. Running it manually

1. Add an npm script to your package.json, such as:

```js
{
  //...
  "scripts": {
    "precise-commits": "precise-commits"
  }
  //...
}
```

2. Execute the npm script, e.g. for the one above run:

```sh
npm run precise-commits
```

## 2. "Precommit" Hook

The recommended way to run `precise-commits` is as a "precommit" hook.

A great tool for setting up the hook is [`husky`](https://github.com/typicode/husky). You can install and run it as follows:

```sh
npm install --save-dev husky
```

Update the `"scripts"` section of your `package.json`:

```js
{
  //...
  "scripts": {
    "precise-commits": "precise-commits",
    "precommit": "npm run precise-commits"
  }
  //...
}
```

## 3. As part of a PR build

When running a build for your PR, you can run `precise-commits` to ensure that the author's changes are all formatted consistently.

The key things you need to configure are:

1. The `--check-only` flag for `precise-commits` so that it will error out if it finds any inconsistent formatting
2. The `--head` and `--base` flags so that `precise-commits` knows what commits it should consider when resolving modified files. Most CI servers will have environment variables you can use to resolve these.

For example, if your PR is building on [Travis](https://travis-ci.com/), your config might look like this:

**.travis.yml**

```yaml
# ... Other config options here ...
install:
  - yarn install
script:
  - 'if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then precise-commits --whitelist="src/**/*.ts" --check-only --head=$TRAVIS_PULL_REQUEST_SHA --base=$(git merge-base HEAD $TRAVIS_BRANCH); fi'
  - yarn test
  - yarn e2e
# ... Other config options here ...
```

<br>

# CLI Configuration Options

As was hinted at above, the `precise-commits` CLI supports a few different configuration options:

* `--whitelist`: **[String, Default: `"*"`]**
  * Whitelist is a glob pattern ([the glob syntax from the glob module is used](https://github.com/isaacs/node-glob/blob/master/README.md#glob-primer)).
  * It is used to inform what files are considered when resolving modified files (by default all are considered).
  * Don't forget the quotes around the globs! The quotes make sure that `precise-commits` expands the globs rather than your shell.

<br>

* `--formatter`: **[String, Default: `"prettier"`]**
  * Currently only prettier is supported
  * If you are interested in adding support for a different formatter, all you need to do is provide an object which [implements this interface](https://github.com/JamesHenry/precise-commits/blob/master/src/precise-formatter.ts).

<br>

* `--check-only`: **[Boolean, Default: `false`]**
  * Only check the code formatting is consistent with the resolved config

<br>

* `--base`: **[String, NO DEFAULT]**
  * Base commit SHA to be used in conjunction with the `--head` flag

<br>

* `--head`: **[String, CONDITIONAL DEFAULT]**
  * Later commit SHA (e.g. the `HEAD` of a PR branch) to be used in conjunction with the `--base` flag
  * NOTE on conditional default: If no value is provided for `--head`, but a value is given for `--base`, it will default to checking "HEAD"
