#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function run(args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NO_COLOR: "1",
      COPILOT_AI_CREDITS_LAYOUT_LINE1: options.layout || "tokens_bar",
      COPILOT_AI_CREDITS_LAYOUT_LINE2: "",
      COPILOT_AI_CREDITS_LAYOUT_LINE3: "",
    },
    input: options.input,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

const samplePayload = readFileSync(join(root, "scripts", "sample-payload.json"), "utf8");

const statusline = run(["scripts/statusline.mjs"], { input: samplePayload });
assert.match(statusline, /🔷 in 184k ♻️ cache 24\.6k 🔶 out 12\.5k/);
assert.doesNotMatch(statusline, /💡|scope prompts|high context/);

const estimate = run([
  "scripts/cost.mjs",
  "estimate",
  "gpt-5.4",
  "--in",
  "1000000",
  "--cached-in",
  "1000000",
  "--out",
  "1000000",
]);
assert.match(estimate, /\$17\.75/);
assert.match(estimate, /1,775 cr/);

console.log("✓ ai-credits smoke tests passed");
