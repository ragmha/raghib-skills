---
name: post-task-code-review
description: 'Mandatory post-task code review using multiple AI models. Runs after every task to catch critical issues (security, correctness, performance, deprecated APIs) and applies fixes automatically.'
---

# Post-Task Code Review

## Overview

After completing **any** coding task (feature, fix, refactor, etc.), run a structured multi-model code review on all changed files. The goal is to catch critical issues before they reach a PR — security holes, logic bugs, performance regressions, deprecated API usage, and type-safety gaps.

## When to Use

This skill is **mandatory after every task**. It runs automatically as the final step before committing. Do not skip it.

---

## Workflow

### Step 1 — Identify Changed Files

```bash
# Staged + unstaged changes vs the merge base
git diff --name-only origin/main...HEAD
```

If no files changed, skip the review.

### Step 2 — Run Automated Checks

Run the project's check suite first to surface any obvious issues. Whatever the
project ships — `npm run lint`, `bun run typecheck`, `pytest`, `cargo check`,
`go vet`, `mvn test` — run all of it before the model-based review.

Fix any failures before proceeding to the model-based review.

### Step 3 — Multi-Model Code Review

Review every changed file through **multiple review passes**, each focusing on a different concern. For each pass, read the changed files and evaluate against the checklist below.

#### Pass 1 — Security & Data Safety

- [ ] No secrets, API keys, or tokens hardcoded
- [ ] No `eval()`, `dangerouslySetInnerHTML`, raw SQL string concatenation, or equivalent unsafe calls
- [ ] User input is validated/sanitized before use (schema validation, parameterized queries)
- [ ] Authorization rules are enforced (RLS / row-level checks / middleware) and not bypassed
- [ ] Privileged credentials (service-role keys, admin tokens) are never exposed to client code
- [ ] No sensitive data logged or exposed in error messages

#### Pass 2 — Correctness & Logic

- [ ] No off-by-one errors, null/undefined dereferences, or unhandled promise rejections
- [ ] Async functions have proper error handling (try/catch or `.catch()`)
- [ ] State updates are immutable (no direct mutation of store state)
- [ ] Framework rules followed (e.g. React rules-of-hooks, correct dependency arrays)
- [ ] Edge cases handled: empty collections, missing optional fields, network failures
- [ ] Database/API queries return expected shapes; nullability is handled

#### Pass 3 — Performance & Best Practices

- [ ] No unnecessary re-renders or recomputes (memoisation / selector narrowing where appropriate)
- [ ] No N+1 queries or unbounded data fetching
- [ ] Large lists use virtualization rather than naïve mapping
- [ ] Images and assets are optimized; no blocking network calls in hot paths
- [ ] Bundle / binary size: no large dependencies imported for trivial use

#### Pass 4 — Deprecated APIs & Type Safety

- [ ] No deprecated API calls (see `no-deprecated-code` skill for lookup tables)
- [ ] No `any` types introduced; generics are properly constrained
- [ ] No `@ts-ignore` — use `@ts-expect-error` with explanation if truly needed
- [ ] Library APIs match the installed major version (no v3 patterns on a v4 install, etc.)

#### Pass 5 — Style & Maintainability

- [ ] Code follows project conventions (import aliases, file naming, module patterns)
- [ ] No dead code, commented-out blocks, or TODO items without linked issues
- [ ] Functions are focused and < 50 lines where practical
- [ ] Error messages are descriptive and actionable
- [ ] Platform-specific code is properly gated (where applicable)

### Step 4 — Report Findings

For each issue found, classify its severity:

| Severity     | Action Required                                  |
| ------------ | ------------------------------------------------ |
| **CRITICAL** | Must fix before commit. Security, data loss, crash. |
| **HIGH**     | Must fix before commit. Logic bugs, type errors.    |
| **MEDIUM**   | Fix now if quick (< 2 min), otherwise create TODO.  |
| **LOW**      | Note for awareness; fix is optional this pass.       |

Format each finding as:

```
[SEVERITY] file:line — description
  → Fix: concrete action to take
```

### Step 5 — Apply Fixes

1. Fix all **CRITICAL** and **HIGH** issues immediately.
2. Fix **MEDIUM** issues if the fix is straightforward.
3. For **LOW** issues, add an inline comment or note them in the commit body.
4. After fixes, re-run Step 2 (lint/typecheck/test) to confirm nothing broke.

### Step 6 — Final Verification

Re-run the project's check suite (lint, typecheck, tests) to confirm a clean
state. Only proceed to commit if everything passes.

---

## Multi-Model Strategy

When multiple AI models are available, use them as independent reviewers:

1. **Primary model** — Performs the full 5-pass review above.
2. **Secondary model(s)** — Asked to review the same diff with a focused prompt:
   - _"Review this diff for security vulnerabilities and correctness bugs only. Be terse. List issues as `[SEVERITY] file:line — description`."_
3. **Reconcile** — Merge findings from all models. Deduplicate. Prioritize by severity.

If only one model is available, run the full 5-pass review yourself. The multi-model path is an enhancement, not a requirement.

### Using Sub-Agents for Parallel Review

When the `runSubagent` tool is available, launch parallel review agents:

```
Agent 1: "Review these changed files for security and data safety issues..."
Agent 2: "Review these changed files for correctness, logic bugs, and edge cases..."
Agent 3: "Review these changed files for performance issues and deprecated API usage..."
```

Collect results, deduplicate, and apply fixes.

---

## Integration with Other Skills

This skill builds on:

- **`no-deprecated-code`** — Supplies the deprecation lookup tables for Pass 4.
- **`conventional-commit`** — After review and fixes, use this skill to craft the commit.
- **`refactor`** — If the review reveals structural issues, apply refactoring techniques.

---

## Example Output

```
=== Post-Task Code Review ===

Changed files (3):
  src/components/UserDetail.tsx
  src/stores/UserStore.ts
  src/lib/api.ts

--- Pass 1: Security & Data Safety ---
✅ No issues found.

--- Pass 2: Correctness & Logic ---
[HIGH] src/stores/UserStore.ts:42 — Promise rejection not caught in fetchUsers
  → Fix: Add try/catch around the API call

--- Pass 3: Performance & Best Practices ---
[MEDIUM] src/components/UserDetail.tsx:18 — Inline object in style prop causes re-renders
  → Fix: Extract to a constant or useMemo

--- Pass 4: Deprecated APIs & Type Safety ---
[CRITICAL] src/lib/api.ts:7 — Using z.string().email() (deprecated in Zod v4)
  → Fix: Replace with z.email()

--- Pass 5: Style & Maintainability ---
✅ No issues found.

Applying fixes...
  ✅ Fixed: UserStore.ts:42 — Added try/catch
  ✅ Fixed: api.ts:7 — Migrated to z.email()
  ⏭️ Deferred: UserDetail.tsx:18 — MEDIUM, noted in commit body

Re-running checks...
  ✅ lint: passed
  ✅ typecheck: passed
  ✅ tests: passed

Ready to commit.
```
