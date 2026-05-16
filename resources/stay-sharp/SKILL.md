---
name: stay-sharp
description: Keep the agent in the "smart zone" by applying context backpressure (silent test/build/lint wrappers, failFast, output filtering) and proactively compacting or handing off before context rot hits the warm (40%) or dumb (70%) zones. Use when running tests/builds/lints, when output is verbose (Maven, Gradle, jest, pytest, vitest, xcodebuild, cargo), when starting a long multi-phase task, when context feels heavy, or when the user mentions context rot, dumb zone, compaction, or auto-compact.
---

# Stay Sharp — Context Backpressure & Zone Discipline

Two jobs: (1) keep verbose output out of context, (2) compact/hand off before reasoning collapses.

## The zones

| Zone | Default | Opus 4.x | Behavior |
|---|---|---|---|
| 🧠 Smart | 0–40% | 0–55% | Peak reasoning — work freely |
| ⚠️ Warm | 40–70% | 55–75% | Drift starts — tighten output, plan a handoff |
| 🧟 Dumb | 70%+ | 75%+ | Hallucinations, loops — **stop and compact** |

Use the Opus column only when you know the active model is Claude Opus 4.x (Context Compaction architecture). Otherwise stick to the universal default — it's the safe floor across GPT-5.x, Gemini, Sonnet, and others.

## Rule 1 — Never let raw test/build/lint output into context

Use `scripts/run_silent.sh`. Pass = single `✓` line. Fail = full output dumped.

```bash
source ~/.copilot/skills/stay-sharp/scripts/run_silent.sh
run_silent "unit tests" "pytest -x"
run_silent "typecheck"  "tsc --noEmit"
run_silent "lint"       "eslint ."
```

Always pair with **failFast**: `pytest -x`, `jest --bail`, `go test -failfast`, `vitest --bail 1`, `mvn -Dsurefire.skipAfterFailureCount=1`.

## Rule 2 — Don't truncate by piping; suppress at the source

Anti-patterns to refuse:
- `cmd | head -n 50` / `| tail` on long-running suites — re-runs waste human time
- `cmd > /dev/null || echo failed` — loses the failure detail you need
- Letting the model "decide" what to summarize after the fact

Decide deterministically up front: success → `✓`, failure → full output.

## Rule 3 — Watch the zone, act early

After every batch of tool calls, glance at context usage. Triggers:

- **≥ 40% (warm):** stop loading new files speculatively. Switch to targeted `view_range` reads. Delegate exploration to a sub-agent (`task` → `explore`) so its context stays out of yours. Write a checkpoint to `plan.md`.
- **≥ 60%:** finish the current sub-task, then **proactively suggest** `/compact` or a fresh session with a handoff doc. Do not start a new sub-task.
- **≥ 70% (dumb):** halt. Tell the user: *"Context is in the dumb zone — I'll compact / hand off before continuing or I'll start hallucinating."* Then invoke the **`handoff`** skill (writes a compacted handoff doc the next agent can pick up) or run `/compact`.

Never wait for auto-compaction at 70%+ — it's lossy.

## Rule 4 — Sub-agents are context firewalls

Heavy exploration, log spelunking, repo-wide greps with big results → delegate to an `explore` or `general-purpose` sub-agent. You receive a summary, not the raw bytes.

## Rule 5 — Filter framework noise

Strip `PASS …` lines, timing, generic stack frames. `scripts/run_silent.sh` already extracts pass/fail counts for pytest, jest, vitest, go test. Extend it per project rather than re-summarizing in chat.

## Quick checklist before any long task

- [ ] Test/build/lint commands wrapped with `run_silent`
- [ ] failFast flags on
- [ ] `plan.md` exists for milestone checkpoints
- [ ] Heavy reads delegated to sub-agents
- [ ] Mental note: compact at 60%, hard stop at 70%

## References

- HumanLayer — *Context-Efficient Backpressure* (`run_silent` pattern)
- arpagon/pi-context-zone — smart/warm/dumb zone thresholds, MRCR v2 data
- Dex Horthy — *No Vibes Allowed* (AI Engineer 2025)
