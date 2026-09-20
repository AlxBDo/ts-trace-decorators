# ts-debug-decorators

TypeScript decorators (TS 5.0+ / ECMAScript Stage 3) for execution logging, traceability, and performance analysis in web applications.

## Installation

```bash
npm install ts-debug-decorators
```

## Public API

- `@LogMethod(options?)`
- `@LogPerformance(options?)`
- `@LogClass(options?)`
- `sanitize(value, options?)`

## Key Features

- `[CALL]`, `[RESULT]`, and `[ERROR]` logs for sync and async methods
- Accurate execution duration with `performance.now()` and slow-call warning (`slowThresholdMs`)
- Recursive sensitive-data masking (`***MASKED***`)
- Runtime toggle via `globalThis.IS_DEBUG_ENABLED` or `globalThis.DEBUG_CONFIG`
- Namespace filtering via `globalThis.DEBUG_NAMESPACES` (`auth:*`, `-auth:sensitive`)
- Customizable console output (`log`, `table`, `warn`, `error`, `group`)
- Grouped trace output (`Debug #tag`) with trace payload aggregation


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
import { LogClass, LogMethod, LogPerformance } from "ts-debug-decorators";

@LogClass({ traceMode: "grouped", tag: "MyTag" })
class UserService {
  @LogMethod({ namespaces: "UserService:*" })
  @LogPerformance({ slowThresholdMs: 100 })
  async login(payload: { email: string; password: string }) {
    return { ok: true, token: "abc" };
  }
}

globalThis.IS_DEBUG_ENABLED = true;
globalThis.DEBUG_NAMESPACES = "UserService:*";
```
