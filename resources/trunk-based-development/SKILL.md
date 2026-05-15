---
name: trunk-based-development
description: 'Trunk-based development workflow with git worktree, conventional commits, and branch naming conventions. Use when starting a new task, creating branches, committing, or opening PRs.'
---

# Trunk-Based Development Workflow

## Overview

This workflow uses trunk-based development. `main` is the trunk. All changes go through short-lived feature branches via pull requests. Never commit directly to `main`.

## Pre-Flight Checks

Before making **any** file modifications:

### 1. Never Work on Main

```bash
current_branch=$(git branch --show-current)
if [ "$current_branch" = "main" ]; then
  echo "ERROR: You are on main. Create a feature branch first."
  exit 1
fi
```

### 2. Ensure You Are Up to Date

```bash
git fetch origin
git rebase origin/main
```

Resolve conflicts immediately — do not defer them.

### 3. Branch Naming Convention

```
<type>/<short-description>
```

| Type        | Use For                                    |
| ----------- | ------------------------------------------ |
| `feat/`     | New features                               |
| `fix/`      | Bug fixes                                  |
| `chore/`    | Maintenance, deps, config                  |
| `refactor/` | Code restructuring without behavior change |
| `docs/`     | Documentation only                         |
| `test/`     | Adding or updating tests                   |
| `ci/`       | CI/CD workflow changes                     |

### 4. Prefer Git Worktrees

Use `git worktree` instead of branch switching to keep `main` pristine. See the `git-worktree` skill for the full workflow.

```bash
git worktree add ../<repo>-feat-<short-name> -b feat/<short-name> origin/main
cd ../<repo>-feat-<short-name>
<your-package-manager> install
```

## During Development

- **Keep branches short-lived.** Target < 1 day of work per branch.
- **Commit frequently** with small, atomic commits. Each commit should compile and pass tests.
- **Rebase onto main** if your branch lives longer than expected: `git fetch origin && git rebase origin/main`.
- **Do not merge main into your branch.** Always rebase for linear history.

## Before Pushing / Opening a PR

1. Rebase onto latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Run the full check suite (lint, typecheck, tests) using whatever scripts the project defines.
3. Push and open a PR against `main`.

## Commit Messages (Conventional Commits)

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/). Use the `conventional-commit` skill for the full workflow.

### Format

```
type(scope): description
```

### Allowed types

`feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`

### Rules

- **type** — required, one of the allowed types above.
- **scope** — optional but recommended (e.g., `feat(auth):`, `fix(ui):`).
- **description** — required, imperative mood ("add", not "added").
- Append `!` after type/scope for breaking changes: `feat!: remove legacy endpoint`.

## Copilot Agent Workflow

When Copilot (or any automated agent) is asked to make changes:

1. **Check current branch.** If on `main`, stop — do not switch branches in the main checkout.
2. **Fetch latest**: `git fetch origin`.
3. **Create a worktree**: `git worktree add ../<repo>-<type>-<name> -b <type>/<name> origin/main`.
4. **`cd` into the worktree** and install dependencies.
5. Make the changes.
6. Stage, review, and commit using the `conventional-commit` skill.
7. Push and open a PR. Never commit or push directly to `main`.
