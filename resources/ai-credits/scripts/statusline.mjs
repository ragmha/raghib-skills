#!/usr/bin/env node
// ai-credits statusline for Copilot CLI.
// Wired up via `statusLine.command` in ~/.copilot/settings.json.
// Reads a JSON payload from stdin on every render and emits up to 3 colored lines.
//
// Design rules (in order of importance):
//   1. Never crash the host CLI. Per-segment safeSegment + global try/catch.
//   2. Never call the agent. This is plain Node — zero AI credits per render.
//   3. Be fast. No network. No subshells beyond `git remote get-url`.
//   4. Be cross-platform. Single .mjs file, optional .cmd wrapper for Windows.

import { execFileSync } from "node:child_process";
import {
  PLANS, USD_PER_CREDIT,
  findModel, computeCost, loadState, totalUsd,
  autoSeedFromEnv,
  fmtUsd, fmtCredits, fmtTokens, fmtDuration,
  gaugeFine, sparkline, gradientAnsi, detectColorSupport,
  loadHistory, saveHistory, visibleLength,
  homeAbbrev, osc8, parseGitHubRemote, layoutFromEnv, envInt, envFlag,
} from "./lib.mjs";

// ---------- bootstrapping ----------

autoSeedFromEnv();

const COLOR = detectColorSupport();
const useNerd = envFlag("COPILOT_AI_CREDITS_NERD") || envFlag("COPILOT_STATUSLINE_NERD");
const useOsc8 = envFlag("COPILOT_AI_CREDITS_OSC8", true);
const gaugeCells = envInt("COPILOT_AI_CREDITS_GAUGE_CELLS", 10);
const sparkLen = envInt("COPILOT_AI_CREDITS_SPARK_LEN", 12);
const pathMode = (process.env.COPILOT_AI_CREDITS_PATH_MODE || "abbrev").toLowerCase();
const cols = Number(process.env.COPILOT_AI_CREDITS_COLS) || process.stdout.columns || Number(process.env.COLUMNS) || 120;

const ICONS = useNerd ? {
  model:    "\uf2db ",
  context:  "\uf233 ",
  duration: "\uf017 ",
  path:     "\uf07b ",
  branch:   "\ue725 ",
  added:    "+",
  removed:  "-",
  credits:  "\uf155 ",
  unlimited:"\uf534 ",
  spark:    "\uf080 ",
  calendar: "\uf133 ",
  out:      "\uf062 ",
  in:       "\uf063 ",
  session:  "\uf2bd ",
} : {
  model:    "🧠 ",
  context:  "",
  duration: "⏱  ",
  path:     "📁 ",
  branch:   "⎇ ",
  added:    "+",
  removed:  "-",
  credits:  "💳 ",
  unlimited:"♾  ",
  spark:    "📈 ",
  calendar: "📅 ",
  out:      "↑",
  in:       "↓",
  session:  "▶ ",
};

// ---------- color helpers ----------

const c = COLOR === 0
  ? { reset:"", dim:"", bold:"", red:"", green:"", yellow:"", blue:"", magenta:"", cyan:"", gray:"", brightWhite:"" }
  : {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: COLOR >= 256 ? "\x1b[38;5;244m" : "\x1b[90m",
    brightWhite: "\x1b[97m",
  };

const wrap = (s, color) => color && s ? `${color}${s}${c.reset}` : s;

// ---------- payload ingestion ----------

async function readStdin(timeoutMs = 250) {
  if (process.stdin.isTTY) return ""; // run from terminal with no pipe — used for testing
  return await new Promise(resolve => {
    let buf = "";
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(buf); } };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { buf += chunk; });
    process.stdin.on("end", finish);
    process.stdin.on("error", finish);
    setTimeout(finish, timeoutMs).unref?.();
  });
}

function safeJson(raw) {
  if (!raw || !raw.trim()) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// ---------- segment helpers ----------

function safeSegment(fn) {
  try {
    const v = fn();
    return v == null || v === "" ? null : v;
  } catch {
    return null;
  }
}

function gitInfo(cwd) {
  if (!cwd) return null;
  try {
    const branch = execFileSync("git", ["-C", cwd, "branch", "--show-current"], { encoding: "utf8", stdio: ["ignore","pipe","ignore"], timeout: 200 }).trim();
    let dirty = false;
    try {
      const status = execFileSync("git", ["-C", cwd, "status", "--porcelain", "--untracked-files=no"], { encoding: "utf8", stdio: ["ignore","pipe","ignore"], timeout: 200 }).trim();
      dirty = status.length > 0;
    } catch {}
    let remoteUrl = "";
    try {
      remoteUrl = execFileSync("git", ["-C", cwd, "remote", "get-url", "origin"], { encoding: "utf8", stdio: ["ignore","pipe","ignore"], timeout: 200 }).trim();
    } catch {}
    return { branch: branch || "", dirty, remoteUrl };
  } catch {
    return null;
  }
}

function pickContextPercent(ctx) {
  if (!ctx) return null;
  if (typeof ctx.current_context_used_percentage === "number") return ctx.current_context_used_percentage;
  if (typeof ctx.used_percentage === "number") return ctx.used_percentage;
  if (typeof ctx.current_context_tokens === "number" && typeof ctx.displayed_context_limit === "number" && ctx.displayed_context_limit > 0) {
    return (ctx.current_context_tokens / ctx.displayed_context_limit) * 100;
  }
  return null;
}

function sessionUsdFromPayload(payload) {
  // Prefer the per-current-model breakdown when present (most accurate).
  const ctx = payload.context_window || {};
  const breakdown = ctx.current_usage;
  const id = payload.model?.id;
  const model = id ? findModel(id) : null;
  if (model && breakdown && typeof breakdown === "object") {
    return computeCost(model, {
      input:      breakdown.input_tokens      ?? breakdown.total_input_tokens      ?? 0,
      cacheRead:  breakdown.cache_read_tokens ?? breakdown.total_cache_read_tokens ?? 0,
      cacheWrite: breakdown.cache_write_tokens ?? breakdown.total_cache_write_tokens ?? 0,
      output:     breakdown.output_tokens     ?? breakdown.total_output_tokens     ?? 0,
    }, { strict: false });
  }
  if (model) {
    return computeCost(model, {
      input:      ctx.total_input_tokens      ?? 0,
      cacheRead:  ctx.total_cache_read_tokens ?? 0,
      cacheWrite: ctx.total_cache_write_tokens ?? 0,
      output:     ctx.total_output_tokens     ?? 0,
    }, { strict: false });
  }
  return null;
}

// ---------- segments ----------

function segModel(payload) {
  const id = payload.model?.display_name || payload.model?.id;
  if (!id) return null;
  return wrap(`${ICONS.model}${id}`, c.cyan);
}

function segContextBar(payload) {
  const ctx = payload.context_window || {};
  const pct = pickContextPercent(ctx);
  if (pct == null) return null;
  const bar = gaugeFine(pct, gaugeCells);
  const tokens = (typeof ctx.current_context_tokens === "number" && typeof ctx.displayed_context_limit === "number")
    ? ` ${fmtTokens(ctx.current_context_tokens)}/${fmtTokens(ctx.displayed_context_limit)}`
    : "";
  const color = gradientAnsi(pct, COLOR);
  return `${ICONS.context}${color}${bar}${c.reset} ${pct.toFixed(0)}%${wrap(tokens, c.dim)}`;
}

function segLastCall(payload) {
  const ctx = payload.context_window || {};
  const inT = ctx.last_call_input_tokens;
  const outT = ctx.last_call_output_tokens;
  if (inT == null && outT == null) return null;
  const parts = [];
  if (inT  != null) parts.push(`${ICONS.in}${fmtTokens(inT)}`);
  if (outT != null) parts.push(`${ICONS.out}${fmtTokens(outT)}`);
  return wrap(`last ${parts.join(" ")}`, c.gray);
}

function segSessionTokens(payload) {
  const ctx = payload.context_window || {};
  const inT  = ctx.total_input_tokens;
  const outT = ctx.total_output_tokens;
  if (inT == null && outT == null) return null;
  const parts = [];
  if (inT  != null) parts.push(`${ICONS.in}${fmtTokens(inT)}`);
  if (outT != null) parts.push(`${ICONS.out}${fmtTokens(outT)}`);
  return wrap(`Σ ${parts.join(" ")}`, c.gray);
}

function segDuration(payload) {
  const ms = payload.cost?.total_duration_ms ?? payload.cost?.total_api_duration_ms;
  if (ms == null) return null;
  return wrap(`${ICONS.duration}${fmtDuration(ms)}`, c.dim);
}

function segPath(payload) {
  const cwd = payload.cwd;
  if (!cwd) return null;
  let label;
  if (pathMode === "leaf") {
    label = String(cwd).replace(/\\/g, "/").split("/").filter(Boolean).pop() || cwd;
  } else if (pathMode === "full") {
    label = cwd;
  } else {
    label = homeAbbrev(cwd);
  }
  return wrap(`${ICONS.path}${label}`, c.blue);
}

function segGit(payload, gi) {
  if (!gi || !gi.branch) return null;
  const dot = gi.dirty ? wrap("●", c.yellow) : wrap("●", c.green);
  let label = `${ICONS.branch}${gi.branch}`;
  const repo = parseGitHubRemote(gi.remoteUrl);
  if (repo && useOsc8) {
    label = osc8(label, `https://github.com/${repo.owner}/${repo.repo}/tree/${encodeURIComponent(gi.branch)}`);
  }
  return `${dot} ${wrap(label, c.magenta)}`;
}

function segLines(payload) {
  const a = payload.cost?.total_lines_added;
  const r = payload.cost?.total_lines_removed;
  if (!a && !r) return null;
  const added = a ? wrap(`${ICONS.added}${a}`, c.green) : "";
  const removed = r ? wrap(`${ICONS.removed}${r}`, c.red) : "";
  return [added, removed].filter(Boolean).join(" ");
}

function segSessionName(payload) {
  const n = payload.session_name;
  if (!n) return null;
  return wrap(`${ICONS.session}${n}`, c.dim);
}

function segCredits(payload) {
  const state = loadState();
  if (!state.plan) return null;                             // first-run nag intentionally OFF
  const plan = PLANS[state.plan];
  const sessionUsd = sessionUsdFromPayload(payload);
  const monthUsd = totalUsd(state) + (sessionUsd || 0);    // fold live session into headline so the bar moves
  if (plan.unlimited) {
    const piece = sessionUsd != null
      ? `session ${fmtUsd(sessionUsd)} (${fmtCredits(sessionUsd)}) · month ${fmtUsd(monthUsd)}`
      : `month ${fmtUsd(monthUsd)}`;
    return `${ICONS.unlimited}${wrap("Unlimited", c.bold)} · ${wrap(piece, c.dim)}`;
  }
  const includedUsd = plan.includedCredits * USD_PER_CREDIT;
  const burnedPct = (monthUsd / includedUsd) * 100;
  const remainingUsd = Math.max(includedUsd - monthUsd, 0);
  const color = gradientAnsi(burnedPct, COLOR);
  const head = `${ICONS.credits}${plan.label.replace("Copilot ", "")}`;
  const sessionPiece = sessionUsd != null ? ` · session ${fmtUsd(sessionUsd)}` : "";
  return `${head}: ${color}${fmtUsd(monthUsd)}${c.reset} / ${fmtUsd(includedUsd)} ${wrap(`(${burnedPct.toFixed(1)}%)`, c.dim)}${sessionPiece} · ${wrap(fmtUsd(remainingUsd) + " left", c.dim)}`;
}

function segSparkline(payload) {
  const ctx = payload.context_window || {};
  const pct = pickContextPercent(ctx);
  if (pct == null) return null;
  let history = loadHistory();
  if (!Array.isArray(history)) history = [];
  history.push(Number(pct.toFixed(2)));
  if (history.length > 40) history = history.slice(-40);
  saveHistory(history);
  const tail = history.slice(-sparkLen);
  if (tail.length < 2) return null;
  const peak = Math.max(...tail);
  const color = gradientAnsi(peak, COLOR);
  return `${ICONS.spark}${color}${sparkline(tail, { min: 0, max: 100 })}${c.reset}`;
}

function segCalendar() {
  const state = loadState();
  if (!state.plan) return null;
  const plan = PLANS[state.plan];
  if (plan.unlimited) return null;
  const now = new Date();
  const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const day  = now.getUTCDate();
  if (day < 2) return null; // not enough signal yet
  const cells = days; // one cell per day
  const elapsedPct = (day / days) * 100;
  const spent = totalUsd(state);
  const includedUsd = plan.includedCredits * USD_PER_CREDIT;
  const burnedPct = includedUsd > 0 ? (spent / includedUsd) * 100 : 0;
  // Color: red if outpacing month, green if behind, yellow if on pace.
  let color = c.green;
  if (burnedPct > elapsedPct + 10) color = c.red;
  else if (burnedPct > elapsedPct - 5) color = c.yellow;
  let bar = "";
  for (let i = 1; i <= cells; i++) {
    if (i < day)        bar += `${color}█${c.reset}`;
    else if (i === day) bar += wrap("▌", c.brightWhite || c.bold);
    else                bar += wrap("░", c.dim);
  }
  return `${ICONS.calendar}${bar} ${wrap(`d${day}/${days}`, c.dim)}`;
}

// ---------- assembly ----------

const SEGMENT_FNS = {
  model:          (p, gi) => segModel(p),
  context_bar:    (p, gi) => segContextBar(p),
  last_call:      (p, gi) => segLastCall(p),
  session_tokens: (p, gi) => segSessionTokens(p),
  duration:       (p, gi) => segDuration(p),
  path:           (p, gi) => segPath(p),
  git:            (p, gi) => segGit(p, gi),
  lines:          (p, gi) => segLines(p),
  session_name:   (p, gi) => segSessionName(p),
  credits:        (p, gi) => segCredits(p),
  sparkline:      (p, gi) => segSparkline(p),
  calendar:       (p, gi) => segCalendar(),
};

const SEP = wrap(" · ", c.dim);

function buildLine(names, payload, gi, maxWidth) {
  const segs = [];
  for (const name of names) {
    const fn = SEGMENT_FNS[name];
    if (!fn) continue;
    const val = safeSegment(() => fn(payload, gi));
    if (val) segs.push(val);
  }
  if (!segs.length) return "";
  // Truncate from the right until the visible line fits.
  while (segs.length > 1) {
    const candidate = segs.join(SEP);
    if (visibleLength(candidate) <= maxWidth) return candidate;
    segs.pop();
  }
  return segs[0] || "";
}

const DEFAULT_L1 = ["model", "context_bar", "last_call", "session_tokens", "duration"];
const DEFAULT_L2 = ["path", "git", "lines", "session_name"];
const DEFAULT_L3 = ["credits", "sparkline", "calendar"];

async function main() {
  const raw = await readStdin();
  const payload = safeJson(raw);
  const gi = gitInfo(payload.cwd);
  const lines = [
    buildLine(layoutFromEnv("COPILOT_AI_CREDITS_LAYOUT_LINE1", DEFAULT_L1), payload, gi, cols),
    buildLine(layoutFromEnv("COPILOT_AI_CREDITS_LAYOUT_LINE2", DEFAULT_L2), payload, gi, cols),
    buildLine(layoutFromEnv("COPILOT_AI_CREDITS_LAYOUT_LINE3", DEFAULT_L3), payload, gi, cols),
  ].filter(Boolean);
  process.stdout.write(lines.join("\n"));
}

try {
  await main();
} catch {
  // Last-ditch fallback. One quiet line is better than crashing or printing nothing.
  process.stdout.write("ai-credits unavailable");
}
