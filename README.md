# ts-trace-decorators

TypeScript decorators (TS 5.0+ / ECMAScript Stage 3) for execution logging, traceability, and performance analysis in web applications.

## Installation

```bash
npm install ts-trace-decorators
```

## Public API

- `@LogMethod(options?)`
- `@LogPerformance(options?)`
- `@LogClass(options?)`
- `sanitize(value, options?)`
- `TRACE_CONFIG` — symbol used to configure tracing per instance

## Key Features

- **Opt-in by default**: nothing is logged unless tracing is explicitly enabled
- Per-instance tracing through the `TRACE_CONFIG` symbol
- Dynamic `tag` / `correlationId` resolved at call time from the instance
- Correlated scopes: nested calls sharing a `correlationId` aggregate into a single group
- `[CALL]`, `[RESULT]`, and `[ERROR]` logs for sync and async methods
- Accurate execution duration with `performance.now()` and slow-call warning (`slowThresholdMs`)
- Recursive sensitive-data masking (`***MASKED***`) with a `maxDepth` traversal guard
- Runtime toggle via `globalThis.__TS_TRACE_ENABLED` or `globalThis.__TS_TRACE_CONFIG`
- Namespace filtering via `globalThis.__TS_TRACE_NAMESPACES` (`auth:*`, `-auth:sensitive`)
- Customizable console output (`log`, `table`, `warn`, `error`, `group`)

## Enabling Tracing

Tracing is **opt-in**. Without one of the switches below, decorated methods run
untouched and emit nothing — published bundles stay silent and payloads private.

```ts
globalThis.__TS_TRACE_ENABLED = true;                 // global switch
globalThis.__TS_TRACE_NAMESPACES = "UserService:*";   // optional filter
```

Resolution order, highest priority first:

1. the decorator option `enabled`
2. the instance config under `TRACE_CONFIG`
3. the global flag, which must be strictly `true`

> The unprefixed `IS_DEBUG_ENABLED`, `DEBUG_CONFIG` and `DEBUG_NAMESPACES`
> globals are still read as a deprecated fallback. Prefer the `__TS_TRACE_*`
> names, which are namespaced to avoid collisions.

## Per-instance Tracing

Enable tracing on a single object — useful when one class is instantiated many
times and only one instance is under investigation.

```ts
import { TRACE_CONFIG } from "ts-trace-decorators";

class Service {
  [TRACE_CONFIG] = { enabled: true, namespaces: "Service:*", tag: "Service#A" };
}
```

## Correlating a Flow

A static `tag` cannot express a runtime value. Use `correlationId` — a string or
a resolver receiving `{ instance, className, methodName, args }` — so calls made
within the same flow are grouped together instead of producing one disconnected
group per method.

```ts
@LogClass({
  traceMode: "grouped",
  tag: "StoreService",
  correlationId: ({ instance }) => instance.storeId,
})
class StoreService {
  constructor(public storeId: string) {}
}
```

Labels become `Debug #StoreService (store-A)`, and nested calls sharing
`store-A` are emitted as a single aggregated trace. A scope is closed only once
the outermost call settles, including for async methods. Scopes are capped at
`MAX_SCOPE_EVENTS` events to bound memory if a flow never settles.


## TypeScript Setup

Enable Stage 3 decorators in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "ESNext.Decorators"]
  }
}
```

## Quick Example

```ts
import { LogClass, LogMethod, LogPerformance } from "ts-trace-decorators";

@LogClass({ traceMode: "grouped", tag: "MyTag" })
class UserService {
  @LogMethod({ namespaces: "UserService:*" })
  @LogPerformance({ slowThresholdMs: 100 })
  async login(payload: { email: string; password: string }) {
    return { ok: true, token: "abc" };
  }
}

globalThis.__TS_TRACE_ENABLED = true;
globalThis.__TS_TRACE_NAMESPACES = "UserService:*";
```

## Sanitization Depth

`sanitize` stops at `maxDepth` (default `8`) and replaces deeper values with
`"[MaxDepth]"`. This bounds the cost of logging large graphs and avoids walking
getter-backed structures such as reactive proxies.

```ts
sanitize(payload, { maxDepth: 3 });
```

## Development

`dist/` is **not** versioned: it is regenerated from `src/` by `npm run build`.
Because the sources use ESM `.js` specifiers, tests always run against the build
output — every test script therefore rebuilds first via a `pre*` hook, so a
stale artifact can never be tested by accident.

```bash
npm run build          # compile src/ to dist/
npm run test:unit      # behaviour tests
npm run test:contract  # publishable artifact: exports map, entry points, defaults
npm test               # both
npm run test:ci        # clean + build + both, as run in CI
```

Tests are split by purpose:

| Folder | Imports | Validates |
| --- | --- | --- |
| `tests/unit/` | `../../dist/index.js` | decorator behaviour and logic |
| `tests/contract/` | `ts-trace-decorators` (self-reference) | the `exports` map, declared entry points, public API surface and the opt-in default |

Contract tests resolve the package through its own name, so a broken `exports`
map fails in CI rather than in downstream projects.

> Running the test suite requires Node **>= 22** (glob patterns in the test
> runner). The published library itself only requires Node >= 18.

