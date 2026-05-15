---
name: no-deprecated-code
description: 'Ensures generated code never uses deprecated APIs, methods, or patterns. Covers detection, prevention, and migration to modern alternatives across the project stack (Zod, React, React Native, Expo, TypeScript, Node.js).'
---

# No Deprecated Code

## Overview

All code generated or modified by Copilot **must avoid deprecated APIs**. Deprecated code creates tech debt, breaks on future upgrades, and produces noisy IDE warnings. This skill establishes a zero-tolerance policy for deprecated usage and provides lookup tables for common migrations.

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
- Check `@deprecated` JSDoc tags, TypeScript deprecation strikethroughs, and library changelogs.
- If the IDE or TypeScript compiler marks a symbol with `@deprecated` (TS error 6385/6387), **do not use it**.

### 2. Prefer Top-Level / Modern Alternatives

Many libraries have migrated from chained builder methods to top-level factory functions. Always prefer the modern form:

```ts
// BAD  — deprecated chained methods
z.string().uuid()
z.string().email()
z.string().url()

// GOOD — top-level functions (Zod v4+)
z.uuid()
z.email()
z.url()
```

### 3. Check Before You Write

Before generating code that uses a library API:

1. Recall the library version from `package.json`.
2. Cross-reference the API against known deprecations for that version (see tables below).
3. If unsure, check the library's official migration guide or changelog.

### 4. Fix Deprecated Code When You Touch It

When editing a file that contains deprecated calls — even if the user didn't ask for a migration — **fix the deprecated calls in the lines you are already modifying**. Do not leave deprecated code in lines you touched.

---

## Deprecation Lookup Tables

### Zod (v4+)

Zod v4 moved string-specific validations from chained methods to top-level schemas.

| Deprecated (Zod v3 style)  | Modern (Zod v4+)   |
| -------------------------- | ------------------ |
| `z.string().uuid()`        | `z.uuid()`         |
| `z.string().email()`       | `z.email()`        |
| `z.string().url()`         | `z.url()`          |
| `z.string().ip()`          | `z.ip()`           |
| `z.string().cuid()`        | `z.cuid()`         |
| `z.string().ulid()`        | `z.ulid()`         |
| `z.string().datetime()`    | `z.iso.datetime()` |
| `z.string().date()`        | `z.iso.date()`     |
| `z.string().time()`        | `z.iso.time()`     |
| `z.string().duration()`    | `z.iso.duration()` |
| `z.string().base64()`      | `z.base64()`       |
| `z.string().base64url()`   | `z.base64url()`    |
| `z.string().jwt()`         | `z.jwt()`          |
| `z.string().cidr()`        | `z.cidr()`         |
| `z.string().nanoid()`      | `z.nanoid()`       |
| `z.object().strict()`      | `z.strictObject()` |
| `z.object().passthrough()` | `z.looseObject()`  |

#### Zod v4 notes

- `z.uuid()` returns a `ZodUUID` (subtype of `ZodString`), so `.optional()`, `.nullable()`, etc. still chain.
- When you need both `z.uuid()` and `.optional()`: `z.uuid().optional()` ✓
- `z.infer<>` works identically on new top-level schemas.

### React / React Native

| Deprecated                                        | Modern Alternative                          |
| ------------------------------------------------- | ------------------------------------------- |
| `componentWillMount`                              | `useEffect` / constructor                   |
| `componentWillReceiveProps`                       | `getDerivedStateFromProps` / `useEffect`    |
| `componentWillUpdate`                             | `getSnapshotBeforeUpdate` / `useEffect`     |
| `React.createClass`                               | `class` or function components              |
| `ReactDOM.render()`                               | `createRoot().render()` (React 18+)         |
| `defaultProps` on function components             | Default parameter values                    |
| `PropTypes` runtime checking                      | TypeScript types                            |
| `NativeEventEmitter` without `removeSubscription` | Use `.remove()` on the subscription object  |
| `AccessibilityInfo.fetch()`                       | `AccessibilityInfo.isScreenReaderEnabled()` |
| `Image.propTypes`                                 | TypeScript types                            |

### Expo SDK 54

| Deprecated                           | Modern Alternative                                            |
| ------------------------------------ | ------------------------------------------------------------- |
| `expo-app-loading` (removed)         | `expo-splash-screen`                                          |
| `expo-random`                        | `expo-crypto`                                                 |
| `Linking.makeUrl()`                  | `Linking.createURL()`                                         |
| `Constants.manifest`                 | `Constants.expoConfig`                                        |
| `AuthSession.startAsync()`           | `AuthSession.useAuthRequest()`                                |
| `Font.loadAsync` in component body   | `useFonts` hook                                               |
| `Updates.fetchUpdateAsync` (old API) | `Updates.checkForUpdateAsync` + `fetchUpdateAsync` (new flow) |

### TypeScript / Node.js

| Deprecated                              | Modern Alternative                          |
| --------------------------------------- | ------------------------------------------- |
| `@ts-ignore`                            | `@ts-expect-error` (type-safe suppression)  |
| `Buffer()` constructor                  | `Buffer.from()` / `Buffer.alloc()`          |
| `new URL().host` for hostname           | `new URL().hostname` (no port)              |
| `fs.exists()`                           | `fs.existsSync()` or `fs.access()`          |
| `util.isArray()` / `util.isDate()` etc. | Native `Array.isArray()`, `instanceof Date` |
| `querystring` module                    | `URLSearchParams`                           |

---

## Verification Workflow

After writing or editing code, run this checklist:

1. **Check IDE diagnostics** — Are there any deprecation warnings (strikethrough text, TS6385/TS6387)?
2. **Run your project's typecheck** (e.g. `tsc --noEmit`, `npm run typecheck`, `bun run typecheck`) — Scan output for "is deprecated" messages.
3. **Search the diff** — Before committing, run:
   ```bash
   git diff --cached | grep -i "deprecated\|@deprecated"
   ```
   If the diff introduces deprecated symbols, fix them before committing.

### Automated detection command

```bash
# Find deprecated Zod v3 patterns in TypeScript files
grep -rn --include='*.ts' --include='*.tsx' \
  -E 'z\.string\(\)\.(uuid|email|url|ip|cuid|ulid|datetime|date|time|duration|base64|jwt|cidr|nanoid)\(' \
  src/
```

---

## Examples

### Zod schema migration

```diff
- id: z.string().uuid(),
+ id: z.uuid(),

- email: z.string().email(),
+ email: z.email(),

- website: z.string().url().optional(),
+ website: z.url().optional(),

- createdAt: z.string().datetime(),
+ createdAt: z.iso.datetime(),
```

### React component migration

```diff
- MyComponent.defaultProps = { color: 'blue' };
+ function MyComponent({ color = 'blue' }: Props) {

- import PropTypes from 'prop-types';
- MyComponent.propTypes = { color: PropTypes.string };
+ // Use TypeScript interface instead (already defined above)
```

### Expo migration

```diff
- import Constants from 'expo-constants';
- const config = Constants.manifest;
+ import Constants from 'expo-constants';
+ const config = Constants.expoConfig;
```

---

## Copilot Agent Tool Names (`.agent.md` files)

Agent files in `.github/agents/` declare tools in YAML frontmatter. Tool names **must use the namespaced format**. Un-namespaced names are deprecated and will fail or produce warnings.

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

| Principle          | Rule                                                    |
| ------------------ | ------------------------------------------------------- |
| **Prevention**     | Check API deprecation status before writing any call    |
| **Detection**      | Use `typecheck`, IDE warnings, and grep to catch issues |
| **Migration**      | Fix deprecated calls in any lines you touch             |
| **Zero tolerance** | Never commit new code with deprecated API usage         |
| **Stay current**   | Reference library changelogs when versions change       |
