# Copilot instructions — ragmha-skills

A Copilot CLI plugin marketplace that bundles ~24 reusable agent **skills** (`SKILL.md` instruction files an agent loads at runtime). This repo is almost entirely Markdown — there is no build, no test runner, and no lint pipeline. Changes are surgical edits to skill files plus README/plugin metadata.

## Repository layout

```
resources/<kebab-case-name>/        # one folder per skill (the unit of change)
  SKILL.md                          # required — frontmatter + workflow
  REFERENCE.md / EXAMPLES.md / *.md # progressive disclosure (see tdd/, improve-codebase-architecture/)
  scripts/                          # optional bundled executables (.mjs, .sh, .plist)
  frames/                           # only used by take-breaks
plugin.json                         # Copilot CLI plugin manifest; `skills: "resources/"`
.github/plugin/marketplace.json     # `copilot plugin marketplace add` entry point
README.md                           # categorised index of every skill (must stay in sync)
CONTRIBUTING.md                     # quality bar + PR rules
```

`resources/` is the **only** skills root; both `plugin.json` and `.github/plugin/marketplace.json` point at it. Don't introduce a parallel skills directory.

## How a skill is loaded (the thing that's easy to get wrong)

The agent only sees the YAML `description:` field when deciding whether to load a skill — the body of `SKILL.md` is invisible until invocation. So the description carries all the routing weight:

```yaml
---
name: skill-name                    # must match folder name
description: <what it does>. Use when <concrete trigger phrases>.
---
```

Rules (from `resources/write-a-skill/SKILL.md`):

- **≤ 1024 chars**, third person.
- First sentence = what it does. Second sentence = `Use when ...` with literal trigger phrases the user might say (e.g. `"diagnose this"`, `"red-green-refactor"`, `"grill me"`). Look at `diagnose`, `tdd`, `grill-me`, `caveman` for the house style.
- Aim for `SKILL.md` ≤ 100 lines. Spill detail into sibling files (`REFERENCE.md`, `EXAMPLES.md`, or topic-specific files like `tdd/mocking.md`, `improve-codebase-architecture/DEEPENING.md`) and link from `SKILL.md`. References go **one level deep**, not nested.

## Bundled scripts

Some skills ship executables under `scripts/` so the workflow runs deterministically and **costs zero AI credits** (e.g. `ai-credits/scripts/cost.mjs`, `stay-sharp/scripts/run_silent.sh`, `take-breaks/scripts/install.sh` + `com.ragmha.cat-gatekeeper.plist`). Add a script when the operation is deterministic, repeated, or needs explicit error handling — not for things the agent can reason about.

When a skill ships scripts, `SKILL.md` shows invocation paths in their **installed** location (`~/.copilot/skills/<name>/scripts/...`), not the repo path.

## Conventions when changing skills

From `CONTRIBUTING.md` and observable patterns:

- **One PR per skill change.** Don't batch unrelated skill edits.
- **Adding a skill** requires four edits in lockstep:
  1. New folder `resources/<kebab-case-name>/SKILL.md` with valid frontmatter.
  2. Add a bullet to `README.md` under the right `###` category, in the exact format:
     ```
     - [`skill-name`](resources/skill-name/SKILL.md) - One-sentence description ending with a period.
     ```
  3. If the skill count changes, update the count in `plugin.json` `description` and `.github/plugin/marketplace.json` (these have already drifted — plugin.json says 24, marketplace.json says 23; treat both as needing review).
  4. Sharpen the `description:` triggers — that's what makes invocation work.
- **New category** in README needs ≥ 2 skills before it's worth creating.
- **Don't add overlapping skills.** Extend the existing one instead.
- **Skills must be actively used**, not aspirational — the bar from CONTRIBUTING.md.

## Build / test / lint

There are none. Validation is manual:

- Frontmatter sanity: every `resources/*/SKILL.md` starts with a `---` block containing `name:` and `description:`.
- For script-bearing skills, run the script directly (e.g. `node resources/ai-credits/scripts/cost.mjs`, `bash resources/stay-sharp/scripts/run_silent.sh -- echo ok`) before committing.
- Plugin install smoke test: `copilot plugin install <local-checkout-path>` then `/skills list` in a Copilot CLI session.

## Style of the skills themselves

Skills are written as **workflows**, not single prompts — phases, checklists, anti-patterns, concrete examples. Match the voice of neighbouring skills in the same category when adding a new one (e.g. `diagnose` and `tdd` set the tone for engineering skills; `writing-fragments`/`writing-shape`/`writing-beats` set it for the writing pipeline).
