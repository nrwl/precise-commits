<h1 align="center">Prettier Lines</h1>

<p align="center">
    <a href="https://travis-ci.org/JamesHenry/prettier-lines"><img src="https://img.shields.io/travis/JamesHenry/prettier-lines.svg?style=flat-square" alt="Travis"/></a>
    <a href="https://github.com/JamesHenry/prettier-lines/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/prettier-lines.svg?style=flat-square" alt="GitHub license" /></a>
    <a href="https://www.npmjs.com/package/prettier-lines"><img src="https://img.shields.io/npm/v/prettier-lines.svg?style=flat-square" alt="NPM Version" /></a>
    <a href="https://www.npmjs.com/package/prettier-lines"><img src="https://img.shields.io/npm/dt/prettier-lines.svg?style=flat-square" alt="NPM Downloads" /></a>
    <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen friendly" /></a>
    <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square" alt="semantic-release" /></a>
    <a href="https://greenkeeper.io"><img src="https://badges.greenkeeper.io/JamesHenry/prettier-lines.svg?style=flat-square" alt="greenkeeper.io" /></a>
</p>

<br>

# The elevator pitch: Why use `prettier-lines`?

It is **unequivocally the least disruptive way** to add code formatting by [Prettier](https://prettier.io) to an existing codebase.

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

This is where `prettier-lines` comes in!

# How it works

Through analyzing your staged files `prettier-lines` will work out exactly what lines and characters within those files have actually been changed or added.

It then uses this information to run [Prettier](https://prettier.io) in a very focused way, allowing it to only reformat what is relevant for your current work, and allowing you to keep your PRs small and focused!

## Installation

`prettier-lines` expects `prettier` to be available as a `peerDependency`, so you will need to install this yourself as a `devDependency` of your project.

```sh
npm install --save-dev prettier prettier-lines
```

## Usage

`prettier-lines` will automatically pick up on any of the standard [Prettier configuration files](https://prettier.io/docs/en/configuration) you may have in your project, including [`.prettierignore`](https://prettier.io/docs/en/ignore#ignoring-files) files.

1. Add an npm script to your package.json, such as:

```json
{
    //...
    "scripts": {
        "prettier-lines": "prettier-lines"`
    }
    //...
}
```

2. Execute the npm script, e.g. for the one above run:

```sh
npm run prettier-lines
```

## "Precommit" Hook

The recommended way to run `prettier-lines` is as a "precommit" hook.

A great tool for setting up the hook is [`husky`](https://github.com/typicode/husky). You can install and run it as follows:

```sh
npm install --save-dev husky
```

Update the `"scripts"` section of your `package.json`:

```json
{
    //...
    "scripts": {
        "prettier-lines": "prettier-lines",
        "precommit": "npm run prettier-lines"`
    }
    //...
}
```
