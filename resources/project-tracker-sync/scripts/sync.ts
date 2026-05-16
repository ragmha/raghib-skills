#!/usr/bin/env bun
/**
 * project-tracker-sync — append or bump the current repo in
 * ~/Documents/open-source/project-tracker/src/data/projects.ts
 *
 * Usage:
 *   bun sync.ts                     # use process.cwd()
 *   bun sync.ts /path/to/repo       # explicit
 *   bun sync.ts --dry               # preview only
 *
 * Output (one line):
 *   + added <name> [<status>] in <group>
 *   ~ bumped <name> -> <status>
 *   ✓ unchanged <name> [<status>]
 *   - skipped <reason>
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const TRACKER =
  process.env.PROJECT_TRACKER_PATH ??
  join(HOME, "Documents/open-source/project-tracker");
const PROJECTS_FILE = join(TRACKER, "src/data/projects.ts");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const target = resolve(args.find((a) => !a.startsWith("--")) ?? process.cwd());

function bail(reason: string): never {
  console.log(`- skipped ${reason}`);
  process.exit(0);
}

if (!existsSync(target) || !statSync(target).isDirectory())
  bail(`not a directory: ${target}`);
if (!existsSync(PROJECTS_FILE))
  bail(`tracker not found at ${PROJECTS_FILE}`);

const repoName = basename(target);
if (repoName === "project-tracker") bail("project-tracker itself");

// --- worktree → parent repo ------------------------------------------------
function resolveCanonicalDir(dir: string): string {
  const gitPath = join(dir, ".git");
  if (existsSync(gitPath) && statSync(gitPath).isFile()) {
    const txt = readFileSync(gitPath, "utf8");
    const m = txt.match(/gitdir:\s*(.+)/);
    if (m) {
      const main = m[1].split("/.git/")[0];
      if (existsSync(main)) return main;
    }
  }
  return dir;
}
const canonical = resolveCanonicalDir(target);
const canonicalName = basename(canonical);

// --- classify status from git ----------------------------------------------
type Status = "doing" | "todo" | "backlog" | "inbox";
function classify(dir: string): Status {
  if (!existsSync(join(dir, ".git"))) return "inbox";
  const sh = (cmd: string) =>
    execSync(cmd, { cwd: dir, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  try {
    const dirty = sh("git status --porcelain");
    if (dirty) return "doing";
    const ts = Number(sh("git log -1 --format=%ct"));
    if (!ts) return "backlog";
    const ageDays = (Date.now() / 1000 - ts) / 86400;
    if (ageDays < 14) return "doing";
    if (ageDays < 90) return "todo";
    return "backlog";
  } catch {
    return "backlog";
  }
}

// --- group / emoji heuristic ----------------------------------------------
function pickGroupAndEmoji(name: string): { group: string; emoji: string } {
  const n = name.toLowerCase();
  const has = (...needles: string[]) => needles.some((k) => n.includes(k));
  if (has("resume", "blog", "raghib.io", "personal-site"))
    return { group: "Road to Excellence 2025", emoji: "📝" };
  if (has("finance", "budget", "trading", "tax", "money"))
    return { group: "Finance & Investment", emoji: "💰" };
  if (has("course", "workshop", "tutorial", "academy", "learning"))
    return { group: "Learning & Courses", emoji: "📚" };
  if (has("gym", "step", "health", "wellness", "prayer", "athan", "indoor-cycling"))
    return { group: "Lifestyle & Personal", emoji: "🌱" };
  if (has("copilot", "agent", "mcp", "llm", "ai-", "rag", "gpt"))
    return { group: "App & Coding Ideas", emoji: "🤖" };
  return { group: "Open Source Repos", emoji: "📦" };
}

// --- file surgery ----------------------------------------------------------
const src = readFileSync(PROJECTS_FILE, "utf8");

function findEntry(name: string):
  | { match: string; status: Status; index: number }
  | null {
  const re = /\{\s*name:\s*"([^"]+)"[^}]*?status:\s*"(\w+)"[^}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m[1].toLowerCase() === name.toLowerCase())
      return { match: m[0], status: m[2] as Status, index: m.index };
  }
  return null;
}

const desiredStatus = classify(canonical);
const existing = findEntry(canonicalName) ?? findEntry(repoName);

if (existing) {
  const promote =
    desiredStatus === "doing" &&
    existing.status !== "doing" &&
    existing.status !== "done" &&
    existing.status !== "archived";
  if (!promote) {
    console.log(`✓ unchanged ${canonicalName} [${existing.status}]`);
    process.exit(0);
  }
  const updated = existing.match.replace(
    /status:\s*"\w+"/,
    `status: "${desiredStatus}"`,
  );
  const next = src.replace(existing.match, updated);
  if (!dry) writeFileSync(PROJECTS_FILE, next);
  console.log(
    `~ bumped ${canonicalName} -> ${desiredStatus}${dry ? " (dry)" : ""}`,
  );
  process.exit(0);
}

// New project — insert just before the `// Archived` block.
const { group, emoji } = pickGroupAndEmoji(canonicalName);
const insertMarker = "  // Archived\n";
const insertAt = src.indexOf(insertMarker);
if (insertAt === -1) bail("could not find insertion point in projects.ts");

const line =
  `  { name: "${canonicalName}", emoji: "${emoji}", group: "${group}", ` +
  `status: "${desiredStatus}" },\n`;
const next = src.slice(0, insertAt) + line + src.slice(insertAt);
if (!dry) writeFileSync(PROJECTS_FILE, next);
console.log(
  `+ added ${canonicalName} [${desiredStatus}] in ${group}${dry ? " (dry)" : ""}`,
);
