# ai-credits Reference

Source of truth: <https://docs.github.com/en/billing/reference/costs-for-github-models>.
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

USD per **1 million** tokens. `cached input` is N/A for non-OpenAI models — pass only `--in` and `--out`.

| Model id | Input | Cached input | Output |
|---|---|---|---|
| gpt-4o                   | $2.50 | $1.25 | $10.00 |
| gpt-4o-mini              | $0.15 | $0.08 | $0.60 |
| gpt-4.1                  | $2.00 | $0.50 | $8.00 |
| gpt-4.1-mini             | $0.40 | $0.10 | $1.60 |
| phi-4                    | $0.13 | N/A   | $0.50 |
| phi-4-mini-instruct      | $0.08 | N/A   | $0.30 |
| phi-4-multimodal-instruct| $0.08 | N/A   | $0.32 |
| deepseek-r1              | $1.35 | N/A   | $5.40 |
| deepseek-r1-0528         | $1.35 | N/A   | $5.40 |
| deepseek-v3-0324         | $1.14 | N/A   | $4.56 |
| mai-ds-r1                | $1.35 | N/A   | $5.40 |
| grok-3-mini              | $0.25 | N/A   | $1.27 |
| grok-3                   | $3.00 | N/A   | $15.00 |
| llama-4-maverick-17b     | $0.25 | N/A   | $1.00 |
| llama-3.3-70b-instruct   | $0.71 | N/A   | $0.71 |

Aliases (e.g. `openai-gpt-4o`, `gpt4o`, `llama-3.3-70b`) work too. See `node scripts/cost.mjs models`.

## Cost formula

```
cost_usd =
    (input_tokens        / 1_000_000) * input_price
  + (cache_read_tokens   / 1_000_000) * cached_input_price        // input_price if model has no cache pricing
  + (output_tokens       / 1_000_000) * output_price
ai_credits = cost_usd / 0.01
```

`record` mode also accumulates `cache_write_tokens` at the standard input price.

## Worked examples

```bash
# 12k prompt + 3k completion on gpt-4o
node scripts/cost.mjs estimate gpt-4o --in 12000 --out 3000
#  cost: $0.0600  (6 cr)
#  vs business plan: 0.32% of allowance

# Same call, with 8k of cached input (warm context window)
node scripts/cost.mjs estimate gpt-4o --in 4000 --cached-in 8000 --out 3000
#  cost: $0.0500  (5 cr)

# DeepSeek-R1 large summary
node scripts/cost.mjs estimate deepseek-r1 --in 80000 --out 5000
#  cost: $0.135  (13.5 cr)
```

## What this skill deliberately does NOT model

| Capability | Why excluded |
|---|---|
| Copilot premium-request quotas (300/mo Business, 1500/mo Enterprise) | Different counter; you can run the new `record` against any number of requests, but the skill doesn't track quota burn |
| `auto`-model 10% discount | Doc note; current price table is published list pricing |
| Data residency 1.4× multiplier | Region-dependent surcharge; not modelled |
| Overage / on-demand rates | Future-proofing — Microsoft has not committed to a static formula |
| Anthropic / Gemini agentic models | Not on the GitHub Models price reference at the time of writing |

If you use Copilot CLI in `unlimited` mode, the skill still computes the equivalent USD cost so you can compare what the same workload would cost on Business or Enterprise.
