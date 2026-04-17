---
name: commit-message
description: Write conventional commit messages following Angular convention
version: "1.0"
always: false
tags: git, workflow
---

# Commit Message Format

When asked to write a commit message, follow the **Conventional Commits** specification (Angular convention):

## Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, CI, dependencies |

## Rules

1. **Subject** — imperative mood, lowercase, no period, max 72 chars
2. **Body** — wrap at 72 chars, explain *what* and *why* (not *how*)
3. **Footer** — reference issues: `Closes #123`, `Fixes #456`
4. **Breaking changes** — prefix body with `BREAKING CHANGE:` or use `!` after type

## Examples

```
feat(auth): add JWT refresh token rotation

Implements automatic token rotation on refresh to limit the window
of token compromise. Refresh tokens are now single-use — each token
exchange issues both a new access token and a new refresh token.

Closes #892
```

```
fix(sandbox)!: reject symlinks in allowedPaths

BREAKING CHANGE: Sandbox.validatePath() now resolves symlinks before
checking against allowedPaths. Previously, a symlink inside an
allowed directory could point to a blocked path.
```
