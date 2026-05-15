# Deprecation Lookup Tables

Per-ecosystem deprecation cheatsheets referenced by the `no-deprecated-code` skill. These are **examples**, not an exhaustive list — add the stacks your project uses and prune anything irrelevant.

---

## Zod (v4+)

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

### Zod v4 notes

- `z.uuid()` returns a `ZodUUID` (subtype of `ZodString`), so `.optional()`, `.nullable()`, etc. still chain.
- When you need both `z.uuid()` and `.optional()`: `z.uuid().optional()` ✓
- `z.infer<>` works identically on new top-level schemas.

### Example migration

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

---

## React / React Native

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

### Example migration

```diff
- MyComponent.defaultProps = { color: 'blue' };
+ function MyComponent({ color = 'blue' }: Props) {

- import PropTypes from 'prop-types';
- MyComponent.propTypes = { color: PropTypes.string };
+ // Use TypeScript interface instead (already defined above)
```

---

## Expo SDK 54+

| Deprecated                           | Modern Alternative                                            |
| ------------------------------------ | ------------------------------------------------------------- |
| `expo-app-loading` (removed)         | `expo-splash-screen`                                          |
| `expo-random`                        | `expo-crypto`                                                 |
| `Linking.makeUrl()`                  | `Linking.createURL()`                                         |
| `Constants.manifest`                 | `Constants.expoConfig`                                        |
| `AuthSession.startAsync()`           | `AuthSession.useAuthRequest()`                                |
| `Font.loadAsync` in component body   | `useFonts` hook                                               |
| `Updates.fetchUpdateAsync` (old API) | `Updates.checkForUpdateAsync` + `fetchUpdateAsync` (new flow) |

### Example migration

```diff
- import Constants from 'expo-constants';
- const config = Constants.manifest;
+ import Constants from 'expo-constants';
+ const config = Constants.expoConfig;
```

---

## TypeScript / Node.js

| Deprecated                              | Modern Alternative                          |
| --------------------------------------- | ------------------------------------------- |
| `@ts-ignore`                            | `@ts-expect-error` (type-safe suppression)  |
| `Buffer()` constructor                  | `Buffer.from()` / `Buffer.alloc()`          |
| `new URL().host` for hostname           | `new URL().hostname` (no port)              |
| `fs.exists()`                           | `fs.existsSync()` or `fs.access()`          |
| `util.isArray()` / `util.isDate()` etc. | Native `Array.isArray()`, `instanceof Date` |
| `querystring` module                    | `URLSearchParams`                           |
