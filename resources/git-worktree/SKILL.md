---
name: git-worktree
description: 'Use git worktree to isolate feature work in a separate directory, keeping the main checkout clean and avoiding branch-switching accidents that corrupt open PRs.'
---

# Git Worktree Workflow

## Why Worktrees?

`git checkout` / `git switch` mutates files in place. If a Copilot session switches branches mid-flight — or forgets to stash — it can:

- Bleed uncommitted changes into the wrong branch.
- Break a running dev server that watches the working tree.
- Silently pollute an open PR with unrelated diffs.

**`git worktree`** solves this by giving each branch its own directory. The main checkout stays on `main` and is never touched.

## Quick Reference

| Action              | Command                                              |
| ------------------- | ---------------------------------------------------- |
| List worktrees      | `git worktree list`                                  |
| Add a worktree      | `git worktree add ../<repo>-<branch> -b <type>/<name>` |
| Remove a worktree   | `git worktree remove ../<repo>-<branch>`             |
| Prune stale entries | `git worktree prune`                                 |

## Workflow

### 1. Keep the Main Checkout on `main`

The primary workspace directory should **always** sit on `main`. Never switch it to a feature branch.

```bash
# Verify — run this before any work
cd <main-checkout-path>
git branch --show-current   # must print "main"
```

### 2. Create a Worktree for Each Task

When starting a new task, create a **sibling** worktree directory instead of switching branches:

```bash
# From the main checkout
cd <main-checkout-path>

# Fetch latest
git fetch origin

# Create worktree + branch in one step
git worktree add ../<repo>-feat-<short-name> -b feat/<short-name> origin/main
```

This creates:

- A new directory `../<repo>-feat-<short-name>` checked out to `feat/<short-name>`.
- The branch is based on `origin/main`.
- The main checkout stays on `main`, untouched.

### 3. Do All Work Inside the Worktree

```bash
cd ../<repo>-feat-<short-name>

# Install deps (worktree has its own node_modules / venv / etc.)
<your-package-manager> install

# Make changes, commit, push
# ... edit files ...
git add .
git commit -m "feat(<scope>): <description>"
git push -u origin feat/<short-name>
```

### 4. Open a PR from the Worktree Branch

Push the branch from inside the worktree directory, then open a PR against `main` on GitHub.

### 5. Clean Up After Merge

```bash
# Return to the main checkout
cd <main-checkout-path>

# Pull latest main
git pull origin main

# Remove the worktree and its local branch
git worktree remove ../<repo>-feat-<short-name>
git branch -d feat/<short-name>
```

#### Optional: automate cleanup

If you want this to happen automatically on every `git pull`, install a
`post-merge` hook that detects merged branches via three checks:

1. **Branch merged into main** — `git branch --merged` (normal merge / fast-forward).
2. **Remote branch deleted** — upstream ref is gone after `git fetch --prune` (GitHub auto-delete or a cleanup workflow).
3. **PR squash-merged** — `gh pr list --state merged` finds a merged PR for the branch head (handles squash-merges where the original commits aren't ancestors of main).

A companion GitHub Actions workflow that deletes the head branch on PR merge ensures Check 2 works on the next `git pull`.

### 6. Prune Stale Worktrees

If a worktree directory was deleted manually (e.g., `rm -rf`), clean up the git metadata:

```bash
git worktree prune
```

## Naming Convention

Worktree directories live as **siblings** of the main repo and follow this pattern:

```
<repo>-<type>-<short-description>
```

Examples (for a repo named `acme`):

- `acme-feat-add-search`
- `acme-fix-routing-bug`
- `acme-chore-update-deps`

This keeps the parent directory tidy and makes it obvious which worktree maps to which branch.

## Rules for Copilot / AI Agents

1. **Never switch the main checkout off `main`.** If `git branch --show-current` does not print `main` in the primary workspace, stop and fix it before proceeding.
2. **Always use `git worktree add`** to start work on a new branch. Do not use `git checkout -b` or `git switch -c` in the main workspace.
3. **Run `<your-package-manager> install`** inside the new worktree before making changes — it has its own `node_modules` / dependency cache.
4. **Commit and push only from inside the worktree directory.**
5. **Clean up** after a PR is merged: `git worktree remove`, then `git branch -d`.
6. If you're resuming work on an existing branch, check if a worktree already exists with `git worktree list` before creating a new one.

## Combining with Trunk-Based Development

This skill **replaces** the branch-creation step in the trunk-based-development instructions. Instead of:

```bash
git checkout main && git checkout -b feat/xyz   # ← mutates the working tree
```

Use:

```bash
git worktree add ../<repo>-feat-xyz -b feat/xyz origin/main   # ← separate directory
```

Everything else (conventional commits, rebase before push, lint/typecheck/test before PR) stays the same.
