// Shared data + helpers for the copilot-business-or-enterprise-plan skill.
// Imported by both the cost calculator (cost.mjs) and the statusline (statusline.mjs).
// Source of truth for prices: https://docs.github.com/en/billing/reference/costs-for-github-models

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const STATE_PATH = join(__dirname, "..", "state.json");
export const HISTORY_PATH = join(__dirname, "..", "statusline-history.json");
export const USD_PER_CREDIT = 0.01;

export const PLANS = {
  business:   { id: "business",   label: "Copilot Business",   pricePerMonthUsd: 19, includedCredits: 1900, unlimited: false },
  enterprise: { id: "enterprise", label: "Copilot Enterprise", pricePerMonthUsd: 39, includedCredits: 3900, unlimited: false },
  unlimited:  { id: "unlimited",  label: "Unlimited",          pricePerMonthUsd: 0,  includedCredits: 0,    unlimited: true  },
};

// USD per 1M token units. cachedInput=null means model has no separate cached price.
export const MODELS = [
  { id: "gpt-4o",                   label: "OpenAI GPT-4o",                     input: 2.50, cachedInput: 1.25, output: 10.00, aliases: ["openai-gpt-4o", "gpt4o"] },
  { id: "gpt-4o-mini",              label: "OpenAI GPT-4o mini",                input: 0.15, cachedInput: 0.08, output: 0.60,  aliases: ["openai-gpt-4o-mini", "gpt4o-mini"] },
  { id: "gpt-4.1",                  label: "OpenAI GPT-4.1",                    input: 2.00, cachedInput: 0.50, output: 8.00,  aliases: ["openai-gpt-4.1", "gpt41"] },
  { id: "gpt-4.1-mini",             label: "OpenAI GPT-4.1-mini",               input: 0.40, cachedInput: 0.10, output: 1.60,  aliases: ["openai-gpt-4.1-mini", "gpt41-mini"] },
  { id: "phi-4",                    label: "Phi-4",                             input: 0.13, cachedInput: null, output: 0.50,  aliases: [] },
  { id: "phi-4-mini-instruct",      label: "Phi-4-mini-instruct",               input: 0.08, cachedInput: null, output: 0.30,  aliases: [] },
  { id: "phi-4-multimodal-instruct",label: "Phi-4-multimodal-instruct",         input: 0.08, cachedInput: null, output: 0.32,  aliases: [] },
  { id: "deepseek-r1",              label: "DeepSeek-R1",                       input: 1.35, cachedInput: null, output: 5.40,  aliases: [] },
  { id: "deepseek-r1-0528",         label: "DeepSeek-R1-0528",                  input: 1.35, cachedInput: null, output: 5.40,  aliases: [] },
  { id: "deepseek-v3-0324",         label: "DeepSeek-V3-0324",                  input: 1.14, cachedInput: null, output: 4.56,  aliases: ["deepseek-v3"] },
  { id: "mai-ds-r1",                label: "MAI-DS-R1",                         input: 1.35, cachedInput: null, output: 5.40,  aliases: [] },
  { id: "grok-3-mini",              label: "Grok 3 Mini",                       input: 0.25, cachedInput: null, output: 1.27,  aliases: [] },
  { id: "grok-3",                   label: "Grok 3",                            input: 3.00, cachedInput: null, output: 15.00, aliases: [] },
  { id: "llama-4-maverick-17b",     label: "Llama 4 Maverick 17B Instruct FP8", input: 0.25, cachedInput: null, output: 1.00,  aliases: ["llama-4-maverick"] },
  { id: "llama-3.3-70b-instruct",   label: "Llama-3.3-70B-Instruct",            input: 0.71, cachedInput: null, output: 0.71,  aliases: ["llama-3.3-70b"] },
];

export function findModel(slug) {
  if (!slug) return null;
  const s = String(slug).trim().toLowerCase();
  // exact id / alias hit
  let hit = MODELS.find(m => m.id === s || m.aliases.includes(s));
  if (hit) return hit;
  // soft-match: a Copilot CLI model id like "gpt-5.4 (high)" carries no token-pricing info,
  // so fall through with a "best guess" by leading slug. We never fabricate prices for
  // an unknown id — caller decides what to do with null.
  return MODELS.find(m => s.startsWith(m.id)) ?? null;
}

// Strict mode rejects cached-input tokens for models without cached pricing (good for manual estimates).
// Lenient mode silently falls back to the regular input price (better for telemetry where we can't say no).
export function computeCost(model, tokens, { strict = false } = {}) {
  const input      = Number(tokens.input      ?? 0) || 0;
  const cacheRead  = Number(tokens.cacheRead  ?? tokens.cachedInput ?? 0) || 0;
  const cacheWrite = Number(tokens.cacheWrite ?? 0) || 0;
  const output     = Number(tokens.output     ?? 0) || 0;

  if (strict && cacheRead > 0 && model.cachedInput == null) {
    const err = new Error(`model "${model.id}" has no cached-input pricing — drop --cached-in`);
    err.code = "NO_CACHED_PRICING";
    throw err;
  }
  const cachedPrice = model.cachedInput ?? model.input;
  return (
    ((input + cacheWrite) / 1_000_000) * model.input +
    (cacheRead             / 1_000_000) * cachedPrice +
    (output                / 1_000_000) * model.output
  );
}

export function currentPeriodKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { plan: null, periodKey: currentPeriodKey(), records: [] };
  }
  try {
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    if (!Array.isArray(raw.records)) raw.records = [];
    if (!raw.periodKey) raw.periodKey = currentPeriodKey();
    if (raw.periodKey !== currentPeriodKey()) {
      // New billing month — drop old records, keep plan choice.
      return { plan: raw.plan ?? null, periodKey: currentPeriodKey(), records: [] };
    }
    return raw;
  } catch {
    return { plan: null, periodKey: currentPeriodKey(), records: [] };
  }
}

export function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

export function totalUsd(state) {
  return state.records.reduce((sum, r) => sum + (Number(r.costUsd) || 0), 0);
}

// Auto-seed state.json from the COPILOT_AI_CREDITS_PLAN env var when no plan is set.
// Lets users opt out of any agent-side setup:
//   export COPILOT_AI_CREDITS_PLAN=unlimited   # (or business|enterprise)
// Returns true if it actually wrote a new plan.
export function autoSeedFromEnv() {
  const envPlan = (process.env.COPILOT_AI_CREDITS_PLAN || "").trim().toLowerCase();
  if (!envPlan || !PLANS[envPlan]) return false;
  const state = loadState();
  if (state.plan) return false;
  state.plan = envPlan;
  saveState(state);
  return true;
}

export function fmtUsd(n) {
  const a = Math.abs(n);
  if (a < 0.01) return `$${n.toFixed(4)}`;
  if (a < 1)    return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function fmtCredits(usd) {
  const c = usd / USD_PER_CREDIT;
  if (Math.abs(c) < 1) return `${c.toFixed(2)} cr`;
  if (Math.abs(c) < 100) return `${c.toFixed(1)} cr`;
  return `${Math.round(c).toLocaleString()} cr`;
}

export function fmtTokens(n) {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) {
    const k = v / 1000;
    return k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const m = v / 1_000_000;
  return m >= 100 ? `${Math.round(m)}M` : `${m.toFixed(2).replace(/\.?0+$/, "")}M`;
}

export function fmtDuration(ms) {
  const s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export function gauge(percent, cells = 10, { full = "█", empty = "░" } = {}) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round((p / 100) * cells);
  return full.repeat(filled) + empty.repeat(cells - filled);
}

// Replace $HOME prefix with ~ and trim to ~last few path segments for status-line readability.
export function homeAbbrev(p, { keepSegments = 3, home = process.env.HOME || process.env.USERPROFILE } = {}) {
  if (!p) return "";
  let s = String(p).replace(/\\/g, "/");
  if (home) {
    const h = String(home).replace(/\\/g, "/").replace(/\/+$/, "");
    if (s === h) return "~";
    if (s.startsWith(h + "/")) s = "~" + s.slice(h.length);
  }
  const isHome = s.startsWith("~");
  const segs = s.replace(/^~\/?/, "").split("/").filter(Boolean);
  const max = isHome ? keepSegments + 1 : keepSegments;
  if (segs.length <= max) return s;
  const tail = segs.slice(-keepSegments).join("/");
  return isHome ? `~/.../${tail}` : `.../${tail}`;
}

// OSC 8 hyperlink wrapper. Modern terminals (iTerm2, WezTerm, Ghostty, Windows Terminal,
// VS Code 1.72+) render the text as a clickable link; others ignore the escapes.
export function osc8(text, url, { enabled = true } = {}) {
  if (!enabled || !url) return text;
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

export function parseGitHubRemote(url) {
  if (!url) return null;
  const cleaned = String(url).trim();
  const ssh = cleaned.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const https = cleaned.match(/^https?:\/\/(?:[^@/]+@)?github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (https) return { owner: https[1], repo: https[2] };
  return null;
}

// Parse a comma-separated layout env var, falling back to the supplied default.
export function layoutFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : fallback;
}

export function envInt(name, fallback) {
  const v = process.env[name];
  if (v == null) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function envFlag(name, fallback = false) {
  const v = (process.env[name] || "").trim().toLowerCase();
  if (!v) return fallback;
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

// Sub-cell progress bar using 1/8th block characters. Smoother than the 10-cell gauge.
const PARTIAL_BLOCKS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];
export function gaugeFine(percent, cells = 10, { empty = "░" } = {}) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const eighths = Math.round((p / 100) * cells * 8);
  const fullCells = Math.floor(eighths / 8);
  const partial = eighths % 8;
  const partialChar = PARTIAL_BLOCKS[partial];
  const remaining = cells - fullCells - (partialChar ? 1 : 0);
  return "█".repeat(fullCells) + partialChar + empty.repeat(Math.max(0, remaining));
}

// Sparkline using 1/8th vertical block characters. Caller passes raw values.
const SPARK_BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
export function sparkline(values, { min = 0, max = 100 } = {}) {
  if (!values?.length) return "";
  const lo = Number.isFinite(min) ? min : Math.min(...values);
  const hi = Number.isFinite(max) ? max : Math.max(...values);
  const span = Math.max(hi - lo, 1);
  return values.map(v => {
    const clamped = Math.max(lo, Math.min(hi, Number(v) || 0));
    const idx = Math.min(7, Math.floor(((clamped - lo) / span) * 8));
    return SPARK_BLOCKS[idx];
  }).join("");
}

// ANSI 256-color escape for a percent on a green→yellow→orange→red gradient.
// `support` is 256, 16, or 0 (no color).
export function gradientAnsi(percent, support = 256) {
  const p = Math.max(0, Math.min(120, Number(percent) || 0));
  if (support === 0) return "";
  if (support < 256) {
    if (p >= 95) return "\x1b[91m"; // bright red
    if (p >= 80) return "\x1b[31m"; // red
    if (p >= 60) return "\x1b[33m"; // yellow
    if (p >= 30) return "\x1b[93m"; // bright yellow
    return "\x1b[92m";              // bright green
  }
  // 256-color stops: bright green → green → yellow-green → yellow → orange → red.
  const stops = [
    [0,   46],   // bright green
    [30,  82],
    [55, 154],
    [70, 220],   // yellow
    [85, 208],   // orange
    [95, 202],
    [100, 196],  // red
    [110, 197],
  ];
  let color = stops[stops.length - 1][1];
  for (const [pct, c] of stops) { if (p <= pct) { color = c; break; } }
  return `\x1b[38;5;${color}m`;
}

// Detect color depth from environment variables (best-effort).
export function detectColorSupport() {
  if (process.env.NO_COLOR != null) return 0;
  const term = process.env.TERM || "";
  const colorterm = process.env.COLORTERM || "";
  if (/truecolor|24bit/i.test(colorterm)) return 256;
  if (/-256(color)?/i.test(term)) return 256;
  if (term === "dumb") return 0;
  if (term) return 16;
  return process.platform === "win32" ? 256 : 16;
}

export function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveHistory(history) {
  try {
    mkdirSync(dirname(HISTORY_PATH), { recursive: true });
    writeFileSync(HISTORY_PATH, JSON.stringify(history) + "\n");
  } catch {
    // Statusline must never crash the host CLI — silently ignore disk failures.
  }
}

// Strip ANSI SGR (\x1b[…m) and OSC 8 hyperlink frames (\x1b]8;;…\x1b\\ or \x07) when measuring.
const ANSI_RE = /\x1b\[[0-9;]*m|\x1b\]8;;[^\x07\x1b]*(?:\x1b\\|\x07)/g;
export function visibleLength(s) {
  if (!s) return 0;
  // Approximate display width: most emoji / CJK glyphs render as 2 columns, ASCII as 1.
  const stripped = s.replace(ANSI_RE, "");
  let width = 0;
  for (const ch of stripped) {
    const code = ch.codePointAt(0);
    if (code >= 0x1100 && (
      code <= 0x115f ||
      (code >= 0x2e80 && code <= 0x303e) ||
      (code >= 0x3041 && code <= 0x33ff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0xa000 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff)
    )) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}
