---
name: conventional-commit
description: Craft a Conventional Commits message for the currently staged changes — pick a type, scope, and imperative description, then commit. Use when the user says "commit", "craft a commit message", "write the commit", or asks for help writing a commit after a unit of work.
---

# Conventional Commit

Build a [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) message for what is currently staged, then commit.

## Workflow

### 1. Confirm what's about to be committed

```bash
git status --short
git diff --cached
```

If nothing is staged, ask the user what to stage. Don't guess — staging is intent.

### 2. Pick a type

| Type       | Use for                                       |
| ---------- | --------------------------------------------- |
| `feat`     | A new user-visible feature                    |
| `fix`      | A bug fix                                     |
| `refactor` | Restructuring without behavior change         |
| `perf`     | Performance improvement                       |
| `docs`     | Documentation only                            |
| `test`     | Adding or correcting tests                    |
| `build`    | Build system, packaging, dependencies         |
| `ci`       | CI/CD configuration                           |
| `chore`    | Routine maintenance with no source impact     |
| `style`    | Formatting / whitespace (no logic change)     |
| `revert`   | Reverts a previous commit                     |

If the diff spans more than one type, the commit is doing too much — split it.

### 3. Pick a scope (optional but recommended)

Scope is a noun in parentheses naming the part of the system touched: `feat(auth):`, `fix(ui):`, `docs(readme):`. If the change is genuinely cross-cutting, omit the scope.

### 4. Write the description

- **Imperative mood.** `add`, not `added`. Read it as completing the sentence "this commit will…".
- **Lowercase.** No trailing period.
- **One line, ≤ 72 chars.** If you need more, put it in the body.

### 5. (Optional) body + footer

- **Body** — Wrap at 72. Explain *why*, not *what* — the diff already shows what. Use bullet points if listing motivations.
- **Footer** — Issue references (`Closes #123`), breaking-change notes, or co-author trailers.
- **Breaking changes** — Either append `!` after the type/scope (`feat(api)!: drop /v1 endpoints`) or add a `BREAKING CHANGE:` footer. Or both.

### 6. Commit

```bash
git commit -m "type(scope): description"
```

For multi-paragraph messages, omit `-m` and let your editor open, or pass multiple `-m` flags (one per paragraph).

## Examples

| Message                                                       | Notes                                  |
| ------------------------------------------------------------- | -------------------------------------- |
| `feat(parser): support trailing commas in array literals`     | Feature with scope                     |
| `fix(ui): correct button alignment on narrow viewports`       | Bug fix with scope                     |
| `docs: update README install steps`                           | Docs change, no scope                  |
| `refactor(auth): extract token-refresh into its own module`   | Behavior-preserving rework             |
| `feat!: drop support for Node 18`                             | Breaking change, no scope              |
| `chore(deps): bump eslint to 9.30`                            | Dependency bump                        |
| `revert: feat(parser): support trailing commas`               | Revert of an earlier commit            |

## Anti-patterns

- `update files` — vague; no type, no information.
- `fix stuff` — same.
- `WIP` — never commit this to the trunk. Squash before merge.
- `feat: Added new feature.` — past tense + trailing period + capitalisation. Should be `feat: add new feature`.
- One commit doing a feature *and* a refactor *and* a doc update. Split the staged diff.

## Combining with other skills

- Use **`git-worktree`** to land each commit on its own branch.
- Use **`trunk-based-development`** to pick the branch name and PR flow that the commit lives inside.
