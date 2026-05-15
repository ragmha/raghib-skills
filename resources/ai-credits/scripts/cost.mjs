#!/usr/bin/env node
// ai-credits cost calculator (USD). Pure shell command — never invokes the agent,
// so running it costs zero AI credits / premium requests.
//
// Usage:
//   node cost.mjs set-plan                         # interactive picker
//   node cost.mjs set-plan <business|enterprise|unlimited>
//   node cost.mjs show-plan
//   node cost.mjs models
//   node cost.mjs estimate <model> --in N [--cached-in N] [--cache-write N] --out N
//   node cost.mjs record   <model> --in N [--cached-in N] [--cache-write N] --out N [--note "..."]
//   node cost.mjs status
//   node cost.mjs reset --yes
//   node cost.mjs help

import { createInterface } from "node:readline/promises";
import {
  PLANS, MODELS, USD_PER_CREDIT, STATE_PATH,
  findModel, computeCost, loadState, saveState, totalUsd, currentPeriodKey,
  autoSeedFromEnv,
  fmtUsd, fmtCredits,
} from "./lib.mjs";

function fail(msg, code = 1) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(code);
}

function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) fail(`unexpected positional arg "${a}"`);
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) { out[key] = true; continue; }
    out[key] = next;
    i++;
  }
  return out;
}

function parseTokens(value, name) {
  const cleaned = String(value).replace(/[_,]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    fail(`${name} must be a non-negative integer (got "${value}")`);
  }
  return n;
}

function planOrDie(state) {
  if (!state.plan) fail("no plan set — run: node cost.mjs set-plan");
  return PLANS[state.plan];
}

function tokensFromFlags(flags) {
  if (flags.in === undefined || flags.out === undefined) {
    fail("both --in and --out are required (token counts)");
  }
  return {
    input:      parseTokens(flags.in,  "--in"),
    cacheRead:  flags["cached-in"] === undefined ? 0 : parseTokens(flags["cached-in"], "--cached-in"),
    cacheWrite: flags["cache-write"] === undefined ? 0 : parseTokens(flags["cache-write"], "--cache-write"),
    output:     parseTokens(flags.out, "--out"),
  };
}

function daysInUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function projectedMonthEndUsd(state) {
  const days = daysInUtcMonth();
  const dayOfMonth = new Date().getUTCDate();
  const elapsed = Math.max(dayOfMonth, 1) / days;
  return totalUsd(state) / elapsed;
}

// ---------- commands ----------

async function cmdSetPlan(args) {
  const choice = (args[0] || "").toLowerCase();
  if (choice && !PLANS[choice]) {
    fail(`plan must be "business", "enterprise", or "unlimited" (got "${args[0]}")`);
  }
  if (choice) {
    return persistPlan(choice);
  }
  // Interactive picker.
  const state = loadState();
  const spent = totalUsd(state);
  const projected = state.records.length ? projectedMonthEndUsd(state) : 0;
  const days = daysInUtcMonth();
  const dayOfMonth = new Date().getUTCDate();

  console.log("Pick a Copilot plan to track AI-credit usage against.\n");
  console.log(`Billing period:    ${state.periodKey}  (day ${dayOfMonth} of ${days})`);
  console.log(`Month-to-date:     ${fmtUsd(spent)}  (${fmtCredits(spent)})`);
  if (state.records.length) {
    console.log(`Projected end-of-month at this pace:  ${fmtUsd(projected)}\n`);
  } else {
    console.log(`Projected end-of-month at this pace:  — (no recorded calls yet)\n`);
  }
  const rows = [];
  for (const id of ["business", "enterprise", "unlimited"]) {
    const p = PLANS[id];
    if (p.unlimited) {
      rows.push(`  unlimited   $0/mo · no cap · informational tracking only`);
      continue;
    }
    const includedUsd = p.includedCredits * USD_PER_CREDIT;
    const burned = includedUsd ? (spent / includedUsd) * 100 : 0;
    const projBurned = includedUsd ? (projected / includedUsd) * 100 : 0;
    const verdict = projBurned > 100 ? "OVER allowance" : projBurned > 80 ? "tight"  : "fits";
    rows.push(`  ${id.padEnd(11)} $${p.pricePerMonthUsd}/mo · ${p.includedCredits.toLocaleString()} credits ($${(includedUsd).toFixed(2)}) · ` +
              `today ${burned.toFixed(1)}% burned · proj ${projBurned.toFixed(1)}% (${verdict})`);
  }
  console.log("Plans:");
  for (const r of rows) console.log(r);
  console.log("");

  // Recommendation.
  let rec = "business";
  if (projected > 19) rec = "enterprise";
  if (state.records.length === 0) rec = "business";
  console.log(`Recommendation: ${rec}${state.plan ? `  (currently set to ${state.plan})` : ""}\n`);

  if (!process.stdin.isTTY) {
    console.log("(stdin is not a TTY — re-run with an explicit choice, e.g. `set-plan unlimited`)");
    return;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("Pick [business/enterprise/unlimited/cancel]: ")).trim().toLowerCase();
  rl.close();
  if (!answer || answer === "cancel" || answer === "c") {
    console.log("cancelled. plan unchanged.");
    return;
  }
  if (!PLANS[answer]) fail(`invalid choice "${answer}"`);
  persistPlan(answer);
}

function persistPlan(choice) {
  const state = loadState();
  state.plan = choice;
  saveState(state);
  const p = PLANS[choice];
  if (p.unlimited) {
    console.log(`plan set to ${p.label} — no cap, costs tracked for information only.`);
  } else {
    console.log(`plan set to ${p.label} — $${p.pricePerMonthUsd}/user/mo, ${p.includedCredits} credits ($${(p.includedCredits * USD_PER_CREDIT).toFixed(2)} included).`);
  }
}

function cmdShowPlan() {
  const state = loadState();
  const p = planOrDie(state);
  console.log(`${p.label}`);
  if (p.unlimited) {
    console.log(`  no monthly cap — informational tracking only`);
  } else {
    console.log(`  price:            $${p.pricePerMonthUsd} / user / month`);
    console.log(`  included credits: ${p.includedCredits} (= $${(p.includedCredits * USD_PER_CREDIT).toFixed(2)})`);
  }
  console.log(`  billing period:   ${state.periodKey}`);
}

function cmdModels() {
  const w = (s, n) => String(s).padEnd(n);
  console.log(`${w("model id", 30)} ${w("input $/M", 10)} ${w("cached $/M", 11)} ${w("write $/M", 10)} ${w("output $/M", 10)}  label`);
  console.log("-".repeat(102));
  for (const m of MODELS) {
    console.log(
      `${w(m.id, 30)} ${w(fmtUsd(m.input), 10)} ${w(m.cachedInput == null ? "N/A" : fmtUsd(m.cachedInput), 11)} ${w(m.cacheWrite == null ? "input" : fmtUsd(m.cacheWrite), 10)} ${w(fmtUsd(m.output), 10)}  ${m.label}`
    );
  }
}

function cmdEstimate(args) {
  const [slug, ...rest] = args;
  if (!slug) fail("estimate requires a <model> arg — see: node cost.mjs models");
  const model = findModel(slug);
  if (!model) fail(`unknown model "${slug}" — see: node cost.mjs models`);
  const flags = parseFlags(rest);
  const tokens = tokensFromFlags(flags);
  let cost;
  try {
    cost = computeCost(model, tokens, { strict: true });
  } catch (e) { fail(e.message); }
  const state = loadState();
  console.log(`${model.label}`);
  console.log(`  tokens:   in=${tokens.input.toLocaleString()}  cached_in=${tokens.cacheRead.toLocaleString()}  out=${tokens.output.toLocaleString()}`);
  console.log(`  cost:     ${fmtUsd(cost)}  (${fmtCredits(cost)})`);
  if (state.plan && !PLANS[state.plan].unlimited) {
    const p = PLANS[state.plan];
    const includedUsd = p.includedCredits * USD_PER_CREDIT;
    console.log(`  vs plan:  ${(cost / includedUsd * 100).toFixed(2)}% of ${p.label} included allowance`);
  } else if (state.plan && PLANS[state.plan].unlimited) {
    console.log(`  vs plan:  Unlimited — informational only`);
  } else {
    console.log("  (no plan set — run set-plan to see % of allowance)");
  }
}

function cmdRecord(args) {
  const [slug, ...rest] = args;
  if (!slug) fail("record requires a <model> arg");
  const model = findModel(slug);
  if (!model) fail(`unknown model "${slug}"`);
  let note = "";
  const noteIdx = rest.indexOf("--note");
  if (noteIdx !== -1) {
    note = rest[noteIdx + 1] ?? "";
    rest.splice(noteIdx, 2);
  }
  const flags = parseFlags(rest);
  const tokens = tokensFromFlags(flags);
  let cost;
  try {
    cost = computeCost(model, tokens, { strict: true });
  } catch (e) { fail(e.message); }
  const state = loadState();
  state.records.push({ at: new Date().toISOString(), model: model.id, tokens, costUsd: cost, note });
  saveState(state);
  console.log(`recorded ${model.label}: ${fmtUsd(cost)} (${fmtCredits(cost)})${note ? ` — ${note}` : ""}`);
  console.log(`month-to-date: ${fmtUsd(totalUsd(state))} across ${state.records.length} call(s)`);
}

function cmdStatus() {
  const state = loadState();
  const p = planOrDie(state);
  const spent = totalUsd(state);
  console.log(`${p.label} — billing period ${state.periodKey}`);
  console.log(`  spent:     ${fmtUsd(spent)}  (${fmtCredits(spent)})`);
  if (p.unlimited) {
    console.log(`  allowance: unlimited`);
  } else {
    const includedUsd = p.includedCredits * USD_PER_CREDIT;
    const remainingUsd = Math.max(includedUsd - spent, 0);
    const pctBurned = includedUsd === 0 ? 0 : (spent / includedUsd) * 100;
    console.log(`  allowance: ${fmtUsd(includedUsd)}  (${p.includedCredits} credits)`);
    console.log(`  burned:    ${pctBurned.toFixed(2)}%`);
    console.log(`  remaining: ${fmtUsd(remainingUsd)}  (${fmtCredits(remainingUsd)})`);
    if (spent > includedUsd) {
      console.log(`  OVER allowance by ${fmtUsd(spent - includedUsd)} — overage pricing not modelled.`);
    }
    if (state.records.length) {
      const projected = projectedMonthEndUsd(state);
      console.log(`  projected end-of-month at this pace: ${fmtUsd(projected)}`);
    }
  }
  if (state.records.length === 0) {
    console.log("  no recorded calls yet.");
    return;
  }
  console.log(`  last ${Math.min(5, state.records.length)} call(s):`);
  for (const r of state.records.slice(-5)) {
    const tag = r.note ? ` — ${r.note}` : "";
    console.log(`    ${r.at}  ${r.model.padEnd(28)} ${fmtUsd(r.costUsd).padStart(8)}${tag}`);
  }
}

function cmdBreakdown(args) {
  const flags = parseFlags(args);
  // Source the breakdown from explicit flags if given, otherwise fall back to a
  // demo payload so a bare `cost.mjs breakdown` always produces something useful.
  const inT     = flags.in      !== undefined ? parseTokens(flags.in,      "--in")      : 2150;
  const outT    = flags.out     !== undefined ? parseTokens(flags.out,     "--out")     : 412;
  const cacheT  = flags.cache   !== undefined ? parseTokens(flags.cache,   "--cache")
                : flags["cached-in"] !== undefined ? parseTokens(flags["cached-in"], "--cached-in")
                : 1200;
  const total   = inT + outT + cacheT;
  const slug    = flags.model || "gpt-5.5";
  const model   = findModel(slug);
  const cost    = model ? computeCost(model, { input: inT, cacheRead: cacheT, output: outT }, { strict: false }) : null;

  // ANSI helpers — kept inline so this file has zero new imports.
  const C = process.stdout.isTTY ? {
    reset:"\x1b[0m", dim:"\x1b[2m", bold:"\x1b[1m",
    blue:"\x1b[34m", magenta:"\x1b[35m", green:"\x1b[32m", white:"\x1b[97m",
    boxDim:"\x1b[2m",
  } : { reset:"", dim:"", bold:"", blue:"", magenta:"", green:"", white:"", boxDim:"" };
  const w = (s, col) => col ? `${col}${s}${C.reset}` : s;
  const bar = (n, max, len) => "█".repeat(Math.max(0, Math.min(len, Math.round(n / Math.max(max, 1) * len))));

  const BAR_LEN = 20;
  const COL = 24;
  const lines = [
    "",
    w("┌────────────────────────────────────────────────────────────────────────────┐", C.boxDim),
    w("│", C.boxDim) + "  " + w("Token breakdown", C.bold) + "                                                            " + w("│", C.boxDim),
    w("├────────────────────────────────────────────────────────────────────────────┤", C.boxDim),
    "",
    "  " + w("↑ WHAT YOU SEND".padEnd(COL), C.blue + C.bold)    + w("↓ WHAT YOU GET".padEnd(COL), C.magenta + C.bold)   + w("⟳ WHAT'S REUSED", C.green + C.bold),
    "  " + w(`Input · ${inT.toLocaleString()}`.padEnd(COL), C.blue) + w(`Output · ${outT.toLocaleString()}`.padEnd(COL), C.magenta) + w(`Cache · ${cacheT.toLocaleString()}`, C.green),
    "  " + w(bar(inT, total, BAR_LEN).padEnd(COL), C.blue) + w(bar(outT, total, BAR_LEN).padEnd(COL), C.magenta) + w(bar(cacheT, total, BAR_LEN), C.green),
    "  " + w("Prompts and new".padEnd(COL), C.dim) + w("AI-generated".padEnd(COL), C.dim)    + w("Context from previous", C.dim),
    "  " + w("context. Can grow".padEnd(COL), C.dim) + w("responses. Typically".padEnd(COL), C.dim) + w("interactions. Improves", C.dim),
    "  " + w("with large files".padEnd(COL), C.dim) + w("the highest cost.".padEnd(COL), C.dim) + w("speed and efficiency.", C.dim),
    "",
    w("├────────────────────────────────────────────────────────────────────────────┤", C.boxDim),
    "  " + w("Billable", C.bold) + " = Input + Output + Cache  =  " + w(total.toLocaleString() + " tokens", C.white + C.bold)
      + (cost != null ? "  =  " + w(fmtUsd(cost), C.white + C.bold) + " " + w(`(${fmtCredits(cost)})`, C.dim) : ""),
    w("└────────────────────────────────────────────────────────────────────────────┘", C.boxDim),
    "",
  ];
  console.log(lines.join("\n"));
  if (!model) {
    console.log(`  (model "${slug}" not in price table — token counts shown, $ omitted)`);
  }
}

function cmdSetLayout(args) {
  if (!args.length) {
    const state = loadState();
    const layout = state.layout || {};
    console.log("Current persisted layout (used when no env var is set):");
    console.log(`  line1: ${Array.isArray(layout.line1) ? layout.line1.join(",") : (layout.line1 || "(unset → default)")}`);
    console.log(`  line2: ${Array.isArray(layout.line2) ? layout.line2.join(",") : (layout.line2 || "(unset → default)")}`);
    console.log(`  line3: ${Array.isArray(layout.line3) ? layout.line3.join(",") : (layout.line3 || "(unset → default)")}`);
    console.log("");
    console.log("Usage:");
    console.log("  cost.mjs set-layout <line1-spec> [line2-spec] [line3-spec]");
    console.log("  cost.mjs set-layout reset            # clear, fall back to defaults");
    console.log("");
    console.log("Examples:");
    console.log('  cost.mjs set-layout "spend,tokens_bar"');
    console.log('  cost.mjs set-layout "credits,tokens_bar" "git,lines"');
    console.log("");
    console.log("Available segments:");
    console.log("  credits, tokens_bar, model, context_bar, last_call, session_tokens,");
    console.log("  duration, path, git, lines, session_name, sparkline, calendar");
    return;
  }
  const state = loadState();
  if (args[0] === "reset" || args[0] === "clear") {
    delete state.layout;
    saveState(state);
    console.log("layout cleared. statusline will fall back to env vars or defaults.");
    return;
  }
  const lines = args.slice(0, 3).map(spec =>
    String(spec).split(",").map(s => s.trim()).filter(Boolean)
  );
  state.layout = {
    line1: lines[0] || [],
    line2: lines[1] || [],
    line3: lines[2] || [],
  };
  saveState(state);
  console.log("layout saved:");
  console.log(`  line1: ${state.layout.line1.join(",") || "(empty)"}`);
  console.log(`  line2: ${state.layout.line2.join(",") || "(empty)"}`);
  console.log(`  line3: ${state.layout.line3.join(",") || "(empty)"}`);
  console.log("");
  console.log("statusline picks this up on its next render — no /restart needed.");
}

function cmdReset(args) {
  const flags = parseFlags(args);
  if (!flags.yes) fail("reset is destructive — re-run with --yes to confirm");
  const state = loadState();
  state.records = [];
  saveState(state);
  console.log("running tally cleared. plan choice preserved.");
}

function cmdHelp() {
  console.log(`ai-credits — true-cost cost calculator for Copilot CLI runs (USD)

This is a regular shell command. Running it never invokes the Copilot agent
and never costs any AI credits / premium requests.

Subcommands:
  set-plan                          Interactive picker (compares Business / Enterprise / Unlimited)
  set-plan <business|enterprise|unlimited>
                                    Non-interactive — set a plan immediately.
  show-plan                         Show the active plan and included allowance.
  models                            List supported models with USD prices per 1M tokens.
  estimate <model> --in N [--cached-in N] [--cache-write N] --out N
                                    One-off cost estimate; no state change.
  record   <model> --in N [--cached-in N] [--cache-write N] --out N [--note "..."]
                                    Append a call to the running tally.
  status                            Month-to-date spend vs included allowance.
  breakdown [--model M --in N --out N --cache N]
                                    Visualize input/output/cache → billable tokens.
  set-layout [line1] [line2] [line3]
                                    Persist statusline layout to state.json.
                                    Pass 'reset' to clear; no args to inspect.
  reset --yes                       Clear the running tally (keeps plan).
  help                              This text.

Headless setup (no commands needed at all):
  export COPILOT_AI_CREDITS_PLAN=unlimited     # business | enterprise | unlimited
  # Statusline auto-seeds state on first render. Persistent thereafter.

State file: ${STATE_PATH}
`);
}

// ---------- dispatch ----------

autoSeedFromEnv();

const [, , sub, ...rest] = process.argv;
try {
  switch (sub) {
    case "set-plan":  await cmdSetPlan(rest); break;
    case "show-plan": cmdShowPlan(); break;
    case "models":    cmdModels(); break;
    case "estimate":  cmdEstimate(rest); break;
    case "record":    cmdRecord(rest); break;
    case "status":    cmdStatus(); break;
    case "breakdown": cmdBreakdown(rest); break;
    case "set-layout":cmdSetLayout(rest); break;
    case "reset":     cmdReset(rest); break;
    case undefined:
    case "help":
    case "-h":
    case "--help":    cmdHelp(); break;
    default:          fail(`unknown subcommand "${sub}" — try: node cost.mjs help`);
  }
} catch (e) {
  fail(e.message || String(e));
}
