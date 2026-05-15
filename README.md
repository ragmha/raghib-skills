# ragmha-skills

> A personal collection of [agent skills](https://github.com/anthropics/skills) for the [GitHub Copilot CLI](https://github.com/github/copilot-cli) and other agentic coding tools.

Skills are reusable `SKILL.md` instruction files that teach an AI agent how to perform a specific workflow. Drop them into `~/.copilot/skills/` (personal) or `<repo>/.github/skills/` (project-scoped) and your agent picks them up.

## Skills

### Context & Session Management

- [`stay-sharp`](resources/stay-sharp/SKILL.md) - Apply context backpressure (silent test/build/lint wrappers, failFast, output filtering) and proactively compact before context rot hits the warm (40%) or dumb (70%) zones.
- [`handoff`](resources/handoff/SKILL.md) - Compact the current conversation into a handoff document for another agent to pick up.
- [`zoom-out`](resources/zoom-out/SKILL.md) - Tell the agent to zoom out and give a higher-level perspective on a section of code.

### Planning & Design

- [`grill-me`](resources/grill-me/SKILL.md) - Interview the user relentlessly about a plan or design until reaching shared understanding.
- [`grill-with-docs`](resources/grill-with-docs/SKILL.md) - Grill a plan against the existing domain model, sharpen terminology, and update CONTEXT.md / ADRs inline as decisions crystallise.
- [`prototype`](resources/prototype/SKILL.md) - Build a throwaway prototype to flesh out a design — a runnable terminal app for state/business-logic, or several radically different UI variations toggleable from one route.

### Issue Tracker Workflow

PRD → issues → triage → execution loop.

- [`to-prd`](resources/to-prd/SKILL.md) - Turn the current conversation into a PRD and publish it to the project issue tracker.
- [`to-issues`](resources/to-issues/SKILL.md) - Break a plan, spec, or PRD into independently-grabbable issues using tracer-bullet vertical slices.
- [`triage`](resources/triage/SKILL.md) - Triage issues through a state machine driven by triage roles — prepare them for an AFK agent or for the next person to grab.
- [`project-tracker-sync`](resources/project-tracker-sync/SKILL.md) - Keep a personal `project-tracker` repo in sync with whatever repo you're working on (kanban-style board across all your projects).

### Code Review & Architecture

- [`review`](resources/review/SKILL.md) - Review changes since a fixed point along two axes — Standards (does it follow this repo's coding standards?) and Spec (does it match what the issue/PRD asked for?). Runs both reviews in parallel sub-agents.
- [`improve-codebase-architecture`](resources/improve-codebase-architecture/SKILL.md) - Find deepening opportunities, informed by the domain language in CONTEXT.md and the decisions in `docs/adr/`.

### Testing

- [`tdd`](resources/tdd/SKILL.md) - Test-driven development with a strict red-green-refactor loop, vertical slices, and integration-test bias.
- [`migrate-to-shoehorn`](resources/migrate-to-shoehorn/SKILL.md) - Migrate test files from `as` type assertions to [`@total-typescript/shoehorn`](https://github.com/total-typescript/shoehorn) for safer partial test data.

### Repo Setup

- [`setup-pre-commit`](resources/setup-pre-commit/SKILL.md) - Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests.
- [`setup-skills`](resources/setup-skills/SKILL.md) - Set up an `## Agent skills` block in `AGENTS.md`/`CLAUDE.md` and `docs/agents/` so engineering skills know this repo's issue tracker, triage labels, and domain doc layout.

### Git Workflow

- [`conventional-commit`](resources/conventional-commit/SKILL.md) - Craft a Conventional Commits message for the currently staged changes — pick a type, scope, and imperative description, then commit.
- [`git-worktree`](resources/git-worktree/SKILL.md) - Isolate per-task feature work in sibling worktree directories instead of switching branches in the main checkout — protects open PRs from accidental cross-contamination.

### Debugging

- [`diagnose`](resources/diagnose/SKILL.md) - Disciplined diagnosis loop for hard bugs and performance regressions — reproduce → minimise → hypothesise → instrument → fix → regression-test.

### Cost & Billing

- [`ai-credits`](resources/ai-credits/README.md) - Track the true USD cost of agentic Copilot work and reconcile it against your plan. Ships a `cost.mjs` CLI and an optional Copilot CLI [statusline](resources/ai-credits/STATUSLINE.md).

### Writing

A three-stage pipeline: raw material → structured article → narrative beats.

- [`writing-fragments`](resources/writing-fragments/SKILL.md) - Mine yourself for fragments (claims, vignettes, sharp sentences) and append them to a single document as raw material.
- [`writing-shape`](resources/writing-shape/SKILL.md) - Take a markdown file of raw material and shape it into an article paragraph by paragraph, arguing about format at each step.
- [`writing-beats`](resources/writing-beats/SKILL.md) - Shape an article as a journey of beats, choose-your-own-adventure style — pick a starting beat, then offer options for where to pivot next.

### Skill Authoring

- [`write-a-skill`](resources/write-a-skill/SKILL.md) - Create new agent skills with proper structure, progressive disclosure, and bundled resources.

### Communication Style

- [`caveman`](resources/caveman/SKILL.md) - Ultra-compressed communication mode. Cuts token usage ~75% by dropping filler while keeping full technical accuracy.

### Wellness

- [`take-breaks`](resources/take-breaks/SKILL.md) - **Cat Gatekeeper** — a macOS launchd agent that opens a Terminal window with an animated ASCII cat and a 5-minute countdown every 30 minutes, forcing you to take a break.

## Installing

### Copilot CLI (recommended)

```bash
copilot plugin marketplace add ragmha/ragmha-skills
copilot plugin install ragmha-skills@ragmha-skills
```

Verify: `copilot plugin list` and `/skills list` (should show 26 skills). Update with `copilot plugin update ragmha-skills`.

### Copilot CLI — manual copy

```bash
git clone https://github.com/ragmha/ragmha-skills.git
mkdir -p ~/.copilot/skills
cp -R ragmha-skills/resources/* ~/.copilot/skills/   # all
cp -R ragmha-skills/resources/diagnose ~/.copilot/skills/   # one
```

### Per-repo (project-scoped)

Drop a skill folder into `<repo>/.github/skills/<name>/`. Project-level skills take precedence over personal and plugin skills.

### VS Code

VS Code Copilot doesn't consume Copilot CLI plugins yet. Copy a skill into your prompts folder and reference it from chat with `#SKILL.md`:

```bash
# macOS
cp -R resources/diagnose "$HOME/Library/Application Support/Code/User/prompts/"
# Linux
cp -R resources/diagnose "$HOME/.config/Code/User/prompts/"
```

For workspace scope, copy into `<repo>/.github/prompts/` instead.

## License

[MIT](LICENSE) — © 2026 Raghib Hasan.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). One PR per skill change; keep `SKILL.md` triggers sharp so model-side invocation works.
