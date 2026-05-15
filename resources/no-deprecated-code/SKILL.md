---
name: no-deprecated-code
description: Zero-tolerance policy for deprecated APIs in generated or edited code — detect before writing, fix as you touch, and verify before committing. Stack-agnostic; ships with optional per-ecosystem lookup tables in `refs/`. Use when generating or editing code, when the user mentions deprecated APIs, migration tables, or asks for "no deprecated code", or when a typecheck surfaces `TS6385`/`TS6387` warnings.
---

# No Deprecated Code

## Overview

All code generated or modified by an agent **must avoid deprecated APIs**. Deprecated code creates tech debt, breaks on future upgrades, and produces noisy IDE warnings. This skill establishes a zero-tolerance policy for deprecated usage.

## When to Use

Apply this skill **by default on every code generation and edit**. Specifically:

- Writing new code that calls any library API
- Modifying existing code (opportunity to migrate deprecated calls)
- Reviewing code for quality
- Upgrading dependencies

---

## Core Rules

### 1. Never Introduce Deprecated Code

- Before using any API, **verify it is not deprecated** in the version installed in the project.
- Check `@deprecated` JSDoc tags, TypeScript deprecation strikethroughs, library changelogs, and language/runtime release notes.
- If the IDE or type checker marks a symbol as deprecated (e.g. TypeScript errors `TS6385` / `TS6387`), **do not use it**.

### 2. Prefer Modern Alternatives

Many libraries migrate from chained builder methods to top-level factories, from class lifecycles to hooks, from synchronous I/O to async, etc. Prefer the modern form even when the deprecated form still compiles.

### 3. Check Before You Write

Before generating code that uses a library API:

1. Recall the library version from the manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, …).
2. Cross-reference the API against known deprecations for that version. For common stacks see [`refs/lookup-tables.md`](refs/lookup-tables.md).
3. If unsure, check the library's official migration guide or changelog.

### 4. Fix Deprecated Code When You Touch It

When editing a file that contains deprecated calls — even if the user didn't ask for a migration — **fix the deprecated calls in the lines you are already modifying**. Do not leave deprecated code in lines you touched.

---

## Verification Workflow

After writing or editing code, run this checklist (adapt commands to your toolchain):

1. **Check IDE diagnostics** — Are there any deprecation warnings (strikethrough text, `TS6385`/`TS6387`, deprecation lints)?
2. **Run the type checker / linter** that the repo uses (e.g. `tsc --noEmit`, `mypy`, `cargo check`, `go vet`, `eslint`). Scan output for `deprecated` messages.
3. **Search the diff** — Before committing, run:
   ```bash
   git diff --cached | grep -i "deprecated\|@deprecated"
   ```
   If the diff introduces deprecated symbols, fix them before committing.

### Targeted detection

For specific migrations you care about, write a focused `grep` over the staged diff or the source tree. Example for one Zod-v3 → v4 family:

```bash
grep -rn --include='*.ts' --include='*.tsx' \
  -E 'z\.string\(\)\.(uuid|email|url|ip|cuid|ulid|datetime|date|time|duration|base64|jwt|cidr|nanoid)\(' \
  src/
```

---

## Per-Ecosystem Lookup Tables

For convenience, **`refs/lookup-tables.md`** ships with deprecation tables for stacks the author works in (Zod v4+, React / React Native, Expo SDK 54+, TypeScript / Node.js).

These are **examples, not a closed list** — the principles above are stack-agnostic. Extend `refs/` with whichever ecosystems your project uses, and prune anything irrelevant.

---

## Agent Tool Names (for VS Code Copilot `.agent.md` files)

This section is for repos that ship VS Code Copilot agents in `.github/agents/*.agent.md`. Agent files declare tools in YAML frontmatter, and tool names **must use the namespaced format**. Un-namespaced names are deprecated and will fail or produce warnings.

### Tool Name Migration Table

| Deprecated (old)      | Current (namespaced)       |
| --------------------- | -------------------------- |
| `codebase`            | `search/codebase`          |
| `changes`             | `read/changes`             |
| `extensions`          | `read/extensions`          |
| `fetch`               | `web/fetch`                |
| `findTestFiles`       | `search/findTestFiles`     |
| `githubRepo`          | `web/githubRepo`           |
| `new`                 | `create/new`               |
| `openSimpleBrowser`   | `web/openSimpleBrowser`    |
| `problems`            | `read/problems`            |
| `runCommands`         | `execute/runCommands`      |
| `runTasks`            | `execute/runTasks`         |
| `runTests`            | `execute/runTests`         |
| `searchResults`       | `search/searchResults`     |
| `terminalCommand`     | `execute/runInTerminal`    |
| `terminalLastCommand` | `read/terminalLastCommand` |
| `terminalSelection`   | `read/terminalSelection`   |
| `testFailure`         | `execute/testFailure`      |
| `usages`              | `search/usages`            |
| `vscodeAPI`           | `read/vscodeAPI`           |

### Already correct (no change needed)

- `edit/editFiles`
- `search` (top-level, not namespaced further)
- `execute/runInTerminal`
- `execute/getTerminalOutput`
- MCP server refs like `microsoft.docs.mcp`

---

## Summary

| Principle          | Rule                                                                |
| ------------------ | ------------------------------------------------------------------- |
| **Prevention**     | Check API deprecation status before writing any call                |
| **Detection**      | Use the type checker, IDE warnings, and grep to catch issues        |
| **Migration**      | Fix deprecated calls in any lines you touch                         |
| **Zero tolerance** | Never commit new code with deprecated API usage                     |
| **Stay current**   | Reference library changelogs when versions change                   |
