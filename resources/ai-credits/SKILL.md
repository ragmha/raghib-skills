---
name: ai-credits
description: Track the true USD cost of agentic Copilot work and reconcile it against Copilot Business ($19 / 1,900 AI credits), Copilot Enterprise ($39 / 3,900 AI credits), or an Unlimited tier. Computes per-call and month-to-date cost from token counts using the published GitHub Models price list, and powers an optional Copilot CLI statusline. Use when the user mentions AI credits, Copilot billing, plan switching, statusline, asks "how much did this cost?", "am I going over my plan?", or wants per-model price comparison.
---

# ai-credits

## Quick start (no agent tokens needed)

This is a plain Node CLI. Running it from your shell costs **zero** AI credits and never invokes Copilot.

```bash
# One-time pick (interactive — shows side-by-side comparison)
node ~/.copilot/skills/ai-credits/scripts/cost.mjs set-plan

# Or non-interactive
node ~/.copilot/skills/ai-credits/scripts/cost.mjs set-plan business     # 1,900 cr
node ~/.copilot/skills/ai-credits/scripts/cost.mjs set-plan enterprise   # 3,900 cr
node ~/.copilot/skills/ai-credits/scripts/cost.mjs set-plan unlimited    # informational only
```

Headless setup — set the plan from your shell rc instead of the agent:

```bash
export COPILOT_AI_CREDITS_PLAN=unlimited     # business | enterprise | unlimited
```

The statusline auto-seeds `state.json` from this on the first render. Set-and-forget.

## When to use

The agent loads this skill when:
- The user mentions: AI credits, Copilot billing, plan switching, "how much will this cost", "am I over my plan", overage, monthly burn.
- The user mentions a specific model (gpt-4o, claude-sonnet, llama, etc.) and wants pricing.
- The user asks about the statusline (install, layout, gauge, sparkline, calendar).

## Workflows

### "How much will this cost?" (estimate before running)

1. Identify the model (default `gpt-4o` if user just says "GPT").
2. Run:
   ```bash
   node scripts/cost.mjs estimate <model> --in <prompt_tokens> [--cached-in N] --out <expected_out>
   ```
3. Report USD + AI credits. If a plan is set, also report % of monthly allowance.
4. If user has no plan: suggest `set-plan` once, then continue.

### "How much have I burned this month?"

1. Run `node scripts/cost.mjs status`.
2. Read out: spent, allowance, % burned, remaining, projected month-end.
3. If projected end > allowance: warn and suggest `set-plan enterprise` for comparison.

### "Switch to Enterprise" / "I changed plans"

1. Run `node scripts/cost.mjs set-plan enterprise`.
2. Confirm the change. Plan switch does NOT clear the running tally.

### "Reset my running tally"

1. Run `node scripts/cost.mjs reset --yes`. Plan choice is preserved.

## Rules

- **Always** call `scripts/cost.mjs`. Never compute prices in your head — `MODELS` in `scripts/lib.mjs` is the source of truth.
- All prices are USD. 1 AI credit = $0.01.
- If `findModel()` returns null, ask which model the user means and offer `node scripts/cost.mjs models`.
- Skip cap math on the unlimited plan.
- Don't model: Copilot premium-request quotas, data-residency 1.4× multiplier, `auto`-model 10% discount, overage rates. See `REFERENCE.md` for the full list.

## Statusline

Optional Copilot CLI statusline that runs on every render (cost-free — no agent involved). Shows model, context gauge, session/month spend vs plan, and a 30-day burn calendar. Install + customization in [STATUSLINE.md](STATUSLINE.md).

## More

- Per-model price table, plan comparison, formula, worked examples, and explicit non-goals: [REFERENCE.md](REFERENCE.md).
- Statusline install (Mac/Linux/Windows), env vars, and segment customization: [STATUSLINE.md](STATUSLINE.md).
