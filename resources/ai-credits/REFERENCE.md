# ai-credits Reference

Source of truth: <https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing>.
Also see <https://docs.github.com/en/copilot/concepts/billing/copilot-requests>.

## Plans

| Plan | USD / user / month | Included AI credits | Included USD value | Notes |
|---|---|---|---|---|
| Business | $19 | 1,900 | $19.00 | Standard org plan |
| Enterprise | $39 | 3,900 | $39.00 | Higher cap, includes more features |
| Unlimited | — | — | — | Informational tracking only — no cap, no projections |

**1 AI credit = $0.01 USD** (derived from $19 / 1,900).

`set-plan unlimited` skips all cap math. Spend is still totalled so you can see what your runs would have cost on Business or Enterprise.

## Model price list

USD per **1 million** tokens.

| Model id | Input | Cached input | Cache write | Output |
|---|---|---|---|---|
| gpt-4.1                  | $2.00 | $0.50  | input | $8.00 |
| gpt-5-mini               | $0.25 | $0.025 | input | $2.00 |
| gpt-5.2                  | $1.75 | $0.175 | input | $14.00 |
| gpt-5.2-codex            | $1.75 | $0.175 | input | $14.00 |
| gpt-5.3-codex            | $1.75 | $0.175 | input | $14.00 |
| gpt-5.4                  | $2.50 | $0.25  | input | $15.00 |
| gpt-5.4-mini             | $0.75 | $0.075 | input | $4.50 |
| gpt-5.4-nano             | $0.20 | $0.02  | input | $1.25 |
| gpt-5.5                  | $5.00 | $0.50  | input | $30.00 |
| claude-haiku-4.5         | $1.00 | $0.10  | $1.25 | $5.00 |
| claude-sonnet-4          | $3.00 | $0.30  | $3.75 | $15.00 |
| claude-sonnet-4.5        | $3.00 | $0.30  | $3.75 | $15.00 |
| claude-sonnet-4.6        | $3.00 | $0.30  | $3.75 | $15.00 |
| claude-opus-4.5          | $5.00 | $0.50  | $6.25 | $25.00 |
| claude-opus-4.6          | $5.00 | $0.50  | $6.25 | $25.00 |
| claude-opus-4.7          | $5.00 | $0.50  | $6.25 | $25.00 |
| gemini-2.5-pro           | $1.25 | $0.125 | input | $10.00 |
| gemini-3-flash           | $0.50 | $0.05  | input | $3.00 |
| gemini-3.1-pro           | $2.00 | $0.20  | input | $12.00 |
| grok-code-fast-1         | $0.20 | $0.02  | input | $1.50 |
| raptor-mini              | $0.25 | $0.025 | input | $2.00 |
| goldeneye                | $1.25 | $0.125 | input | $10.00 |

Aliases for common Copilot CLI variants work too. See `node scripts/cost.mjs models`.

## Cost formula

```
cost_usd =
    (input_tokens        / 1_000_000) * input_price
  + (cache_read_tokens   / 1_000_000) * cached_input_price        // input_price if model has no cache pricing
  + (cache_write_tokens  / 1_000_000) * cache_write_price         // input_price unless model has a separate cache-write price
  + (output_tokens       / 1_000_000) * output_price
ai_credits = cost_usd / 0.01
```

`record` mode also accepts `--cache-write`; Anthropic models use their separate cache-write price.

## Worked examples

```bash
# 12k prompt + 3k completion on Claude Sonnet 4.6
node scripts/cost.mjs estimate claude-sonnet-4.6 --in 12000 --out 3000
#  cost: $0.081  (8.1 cr)
#  vs business plan: 0.43% of allowance

# Same call, with 8k of cached input (warm context window)
node scripts/cost.mjs estimate claude-sonnet-4.6 --in 4000 --cached-in 8000 --out 3000
#  cost: $0.059  (5.9 cr)

# Opus high-output turn
node scripts/cost.mjs estimate claude-opus-4.7 --in 80000 --out 5000
#  cost: $0.525  (52.5 cr)
```

## What this skill deliberately does NOT model

| Capability | Why excluded |
|---|---|
| Copilot premium-request quotas (300/mo Business, 1500/mo Enterprise) | Different counter; you can run the new `record` against any number of requests, but the skill doesn't track quota burn |
| `auto`-model 10% discount | Doc note; current price table is published list pricing |
| Data residency 1.4× multiplier | Region-dependent surcharge; not modelled |
| Overage / on-demand rates | Future-proofing — Microsoft has not committed to a static formula |
| Models not shown in the billing docs | The tracker follows the public Copilot billing reference, not generic provider price sheets |

If you use Copilot CLI in `unlimited` mode, the skill still computes the equivalent USD cost so you can compare what the same workload would cost on Business or Enterprise.
