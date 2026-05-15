---
name: trunk-based-development
description: Orchestrates trunk-based development — short-lived branches off `main`, rebase (never merge) before opening a PR, and never commit directly to `main`. Delegates branch creation to the `git-worktree` skill and commit formatting to the `conventional-commit` skill. Use when starting a new task, creating branches, committing, or opening PRs.
---

# Trunk-Based Development Workflow

`main` is the trunk. All changes go through **short-lived** feature branches via pull requests. Never commit directly to `main`.

This skill is the **orchestrator**. It points at sister skills for the mechanics:

- For creating and isolating the branch → see the **`git-worktree`** skill.
- For commit message formatting → see the **`conventional-commit`** skill.

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

### 4. Create the Branch in a Worktree

Use `git worktree` instead of branch switching, so the main checkout stays on `main`. See the **`git-worktree`** skill for the full workflow.

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
2. Run the project's full check suite (lint, typecheck, tests). Use the
   commands defined in the repo's `package.json` / `Makefile` / equivalent.
3. Push and open a PR against `main`.

## Commit Messages

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/). See the **`conventional-commit`** skill for the full type table, scope/description rules, body/footer guidance, and examples.

## Copilot Agent Workflow

When Copilot (or any automated agent) is asked to make changes:

1. **Check current branch.** If on `main`, stop — do not switch branches in the main checkout.
2. **Fetch latest**: `git fetch origin`.
3. **Create a worktree + branch** following the `git-worktree` skill.
4. **`cd` into the worktree** and install dependencies.
5. Make the changes.
6. Stage, review, and commit following the `conventional-commit` skill.
7. Push and open a PR. Never commit or push directly to `main`.
