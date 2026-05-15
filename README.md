# raghib-skills

> A personal collection of [agent skills](https://github.com/anthropics/skills) I use with the [GitHub Copilot CLI](https://github.com/github/copilot-cli) and other agentic coding tools.

Skills are reusable `SKILL.md` instruction files that teach an AI agent how to perform a specific workflow — from disciplined debugging to issue triage to writing articles. They live in `~/.copilot/skills/` (personal, available everywhere) or in a repo's `.github/skills/` (project-specific).

## Contents

- [Skills](#skills)
  - [Context & Session Management](#context--session-management)
  - [Planning & Design](#planning--design)
  - [Issue Tracker Workflow](#issue-tracker-workflow)
  - [Code Review & Architecture](#code-review--architecture)
  - [Testing](#testing)
  - [Repo Setup](#repo-setup)
  - [Debugging](#debugging)
  - [Writing](#writing)
  - [Skill Authoring](#skill-authoring)
  - [Communication Style](#communication-style)
  - [Wellness](#wellness)
- [Installing](#installing)
- [License](#license)
- [Contributing](#contributing)

---

## Skills

Ready-to-use `SKILL.md` files. Drop the folder you want into `~/.copilot/skills/` (global) or `<repo>/.github/skills/` (per-repo) and your agent will pick it up.

### Context & Session Management

Keeping the agent in the smart zone and handing work between sessions cleanly.

- [`stay-sharp`](resources/stay-sharp/SKILL.md) - Apply context backpressure (silent test/build/lint wrappers, failFast, output filtering) and proactively compact or hand off before context rot hits the warm (40%) or dumb (70%) zones.
- [`handoff`](resources/handoff/SKILL.md) - Compact the current conversation into a handoff document for another agent to pick up.
- [`zoom-out`](resources/zoom-out/SKILL.md) - Tell the agent to zoom out and give broader context or a higher-level perspective on a section of code.

### Planning & Design

Stress-testing plans before you commit code to them.

- [`grill-me`](resources/grill-me/SKILL.md) - Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree.
- [`grill-with-docs`](resources/grill-with-docs/SKILL.md) - Grill a plan against the existing domain model, sharpen terminology, and update documentation (CONTEXT.md, ADRs) inline as decisions crystallise.
- [`prototype`](resources/prototype/SKILL.md) - Build a throwaway prototype to flesh out a design — either a runnable terminal app for state/business-logic questions, or several radically different UI variations toggleable from one route.

### Issue Tracker Workflow

PRD → issues → triage → execution loop.

- [`to-prd`](resources/to-prd/SKILL.md) - Turn the current conversation context into a PRD and publish it to the project issue tracker.
- [`to-issues`](resources/to-issues/SKILL.md) - Break a plan, spec, or PRD into independently-grabbable issues using tracer-bullet vertical slices.
- [`triage`](resources/triage/SKILL.md) - Triage issues through a state machine driven by triage roles — prepare them for an AFK agent or for the next person to grab.
- [`project-tracker-sync`](resources/project-tracker-sync/SKILL.md) - Keep a personal `project-tracker` repo in sync with whatever repo you're currently working on (kanban-style board across all your projects).

### Code Review & Architecture

- [`review`](resources/review/SKILL.md) - Review changes since a fixed point along two axes — Standards (does it follow this repo's coding standards?) and Spec (does it match what the issue/PRD asked for?). Runs both reviews in parallel sub-agents.
- [`improve-codebase-architecture`](resources/improve-codebase-architecture/SKILL.md) - Find deepening opportunities in a codebase, informed by the domain language in CONTEXT.md and the decisions in `docs/adr/`.

### Testing

- [`tdd`](resources/tdd/SKILL.md) - Test-driven development with a strict red-green-refactor loop, vertical slices, and integration-test bias.
- [`migrate-to-shoehorn`](resources/migrate-to-shoehorn/SKILL.md) - Migrate test files from `as` type assertions to [`@total-typescript/shoehorn`](https://github.com/total-typescript/shoehorn) for safer partial test data.

### Repo Setup

- [`setup-pre-commit`](resources/setup-pre-commit/SKILL.md) - Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo.
- [`setup-skills`](resources/setup-skills/SKILL.md) - Set up an `## Agent skills` block in `AGENTS.md`/`CLAUDE.md` and `docs/agents/` so the engineering skills know this repo's issue tracker, triage label vocabulary, and domain doc layout.

### Debugging

- [`diagnose`](resources/diagnose/SKILL.md) - Disciplined diagnosis loop for hard bugs and performance regressions — reproduce → minimise → hypothesise → instrument → fix → regression-test.

### Writing

A three-stage writing pipeline (raw material → structured article → narrative beats).

- [`writing-fragments`](resources/writing-fragments/SKILL.md) - Grilling session that mines you for fragments — heterogeneous nuggets of writing (claims, vignettes, sharp sentences, half-thoughts) — and appends them to a single document as raw material.
- [`writing-shape`](resources/writing-shape/SKILL.md) - Take a markdown file of raw material and shape it into an article through a conversational session — drafting candidate openings, growing the piece paragraph by paragraph, arguing about format at each step.
- [`writing-beats`](resources/writing-beats/SKILL.md) - Shape an article as a journey of beats, choose-your-own-adventure style. Pick a starting beat, write only that beat, then offer options for where to pivot next.

### Skill Authoring

- [`write-a-skill`](resources/write-a-skill/SKILL.md) - Create new agent skills with proper structure, progressive disclosure, and bundled resources.

### Communication Style

- [`caveman`](resources/caveman/SKILL.md) - Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler, articles, and pleasantries while keeping full technical accuracy.

### Wellness

- [`take-breaks`](resources/take-breaks/SKILL.md) - **Cat Gatekeeper** — a macOS launchd agent that opens a new Terminal window with an animated ASCII cat and a 5-minute countdown every 30 minutes, forcing you to take a break.

---

## Installing

### A single skill

```bash
# clone this repo somewhere
git clone https://github.com/ragmha/raghib-skills.git ~/code/raghib-skills

# copy the skill you want into your global skills folder
cp -R ~/code/raghib-skills/resources/diagnose ~/.copilot/skills/
```

The agent will discover it on the next session.

### All skills at once

```bash
git clone https://github.com/ragmha/raghib-skills.git ~/code/raghib-skills
mkdir -p ~/.copilot/skills
cp -R ~/code/raghib-skills/resources/* ~/.copilot/skills/
```

### Per-repo

Drop a skill into `<repo>/.github/skills/<name>/` to make it project-specific.

---