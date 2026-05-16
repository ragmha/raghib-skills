---
name: project-tracker-sync
description: Keep ~/Documents/open-source/project-tracker in sync with whatever repo the user is currently working on. Use when starting work in any repo under ~/Documents/open-source/, after meaningful commits, or when the user mentions "sync to project-tracker", "track this project", "add to my tracker", or "update kanban".
---

# project-tracker-sync

Single source of truth: `~/Documents/open-source/project-tracker/src/data/projects.ts`
(seed list — the Tauri app merges saved status on top of it).

## When to run this skill

Trigger automatically — don't wait to be asked — whenever **any** of these are true:

- The session's `cwd` is a repo under `~/Documents/open-source/<name>/` and you are about to make non-trivial changes.
- You just helped the user finish a meaningful unit of work (commit, PR, deploy).
- The user mentions any of: "sync tracker", "track this", "kanban", "what am I working on".

Do **not** run for: project-tracker itself, dotfile tweaks, throwaway scripts in `/tmp`, or read-only exploration.

## Quick start (one command)

```bash
bun ~/.copilot/skills/project-tracker-sync/scripts/sync.ts
```

With no args it inspects `process.cwd()`, decides a status from git state, and either adds the project or bumps its status. Idempotent — safe to re-run.

## Workflow

1. **Detect**: `basename($cwd)` → candidate project name. If it's `project-tracker` itself, stop.
2. **Classify status** from git:
   - DIRTY working tree, OR last commit < 14 days → `doing`
   - last commit < 90 days → `todo`
   - older / no commits → `backlog`
   - no `.git` → `inbox`
3. **Run the script** above. Read its stdout — it prints `+ added`, `~ bumped`, or `✓ unchanged`.
4. **If the script added a new project**, open `src/data/projects.ts` and improve the auto-picked emoji/group if obvious (e.g., learning repos → "Learning & Courses", finance → "Finance & Investment"). Use existing groups; only create a new group if nothing fits.
5. **Verify**: `cd ~/Documents/open-source/project-tracker && bun run test` — must stay green (42+ tests).
6. **Tell the user** in one line: `tracker: + <name> [<status>] in <group>` (or `unchanged`).

## Status-bump rules (existing projects)

- Project already tracked + you're actively editing it → bump to `doing`.
- User says "I'm done with X" → bump to `done`.
- User says "park X" / "shelf X" → bump to `backlog`.
- Never silently move `done` → anything else; ask first.

## Group conventions

| Signal in repo                                                         | Group                  |
|------------------------------------------------------------------------|------------------------|
| React Native / Expo / mobile app                                       | Tracked Projects       |
| AI/agent/LLM tooling, MCP servers, copilot-* utilities                 | App & Coding Ideas     |
| Personal site, resume, blog                                            | Road to Excellence 2025|
| Finance, budget, trading, tax                                          | Finance & Investment   |
| Course / workshop / tutorial follow-along                              | Learning & Courses     |
| Health, steps, gym, wellness, prayer                                   | Lifestyle & Personal   |
| Generic OSS / fork / unclear                                           | Open Source Repos      |

## Edge cases

- **Worktrees** (e.g., `gym-chore-*`): script auto-resolves to the parent repo (`gym`); only the parent gets bumped, no extra entry.
- **Forks** (remote not under `ragmha/`): skip; not your project.
- **No git**: still add with status `inbox` so it shows up for triage.
- **Casing**: prefer the repo's actual basename. The script does case-insensitive dedup against existing entries.

## Files

- `SKILL.md` — this file
- `scripts/sync.ts` — bun script that does the file edit (read with `view` if behaviour surprises you)
