# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING** — Renamed the package from `ts-debug-decorators` to `ts-trace-decorators` to match the repository name.
  Update imports accordingly: `import { LogMethod } from "ts-trace-decorators"`.
- **BREAKING** — Tracing is now **opt-in**. `shouldEnableDebug()` previously returned `true` whenever the
  global flag was left undefined, so any decorated method logged its arguments as soon as the package was
  imported. Enabling now requires an explicit `enabled` option, a per-instance config, or a global set to
  strictly `true`.
- **BREAKING** — Runtime globals are prefixed: `__TS_TRACE_ENABLED`, `__TS_TRACE_CONFIG` and
  `__TS_TRACE_NAMESPACES`. The unprefixed `IS_DEBUG_ENABLED`, `DEBUG_CONFIG` and `DEBUG_NAMESPACES`
  remain readable as a deprecated fallback.
- `tag` and the new `correlationId` accept a resolver `({ instance, className, methodName, args }) => string`,
  making labels derivable from runtime state instead of being frozen at class-definition time.
- Shared types moved to `src/types/` and re-exported from `config.ts`, keeping the public API unchanged.
- Internal wrapped-method marker symbol renamed to `ts-trace-decorators:wrapped`.
- Declared the license as `MIT`, matching the bundled `LICENSE` file (previously `ISC`).
- Filled in the `author` field and added `homepage` / `bugs` metadata.

### Added

- `TRACE_CONFIG` symbol to configure tracing **per instance** (`enabled`, `namespaces`, `tag`,
  `correlationId`), so a single object can be traced while its siblings stay silent.- `correlationId` option plus a correlated trace scope: nested calls sharing an id aggregate into a
  single grouped trace instead of one disconnected group per method. Async flows keep their scope open
  until the outermost call settles.
- `MAX_SCOPE_EVENTS` cap and `clearScopes()` helper to bound memory and reset state in tests.
- `sanitize` gained a `maxDepth` option (default `8`, exported as `DEFAULT_MAX_DEPTH`) that replaces
  deeper values with `"[MaxDepth]"`, bounding traversal of large or getter-backed graphs.
- `getInstanceConfig()` and `formatLabel()` helpers.
- Continuous integration workflow (`.github/workflows/ci.yml`) running build, unit tests and
  contract tests on Node 22/24 across Linux and Windows, plus a publishable-tarball check.
- Contract test suite (`tests/contract/`) validating the `exports` map through a package
  self-reference, the declared entry points, the public API surface and the opt-in default.
- Dedicated scripts `test:unit`, `test:contract` and `test:ci`, each guarded by a `pre*` hook
  that rebuilds first so a stale `dist/` can never be tested.

### Removed

- `dist/` and `node_modules/` are no longer tracked in git (578 tracked files down to 14).
  A `.gitignore` was added; `dist/` is rebuilt by `npm run build` and `prepublishOnly`.

### Fixed

- `@LogClass` returned an anonymous subclass, so `constructor.name` became `"Decorated"`. This corrupted
  namespace resolution, devtools display and any name-based logic. The original class name is now preserved.
- Grouped traces emitted an identical `Debug #tag` label for every instance, making concurrent flows
  indistinguishable; labels now include the resolved correlation id.
- `repository.url` pointed to a local address (`http://localhost:26831/...`) and is now the canonical GitHub URL.
- The `clean` script used `rm -rf`, which fails on Windows and therefore broke `prepublishOnly`.
  It now uses a cross-platform `node -e "require('node:fs').rmSync(...)"` call.

### Migration

```diff
-globalThis.IS_DEBUG_ENABLED = true
-globalThis.DEBUG_NAMESPACES = "UserService:*"
+globalThis.__TS_TRACE_ENABLED = true
+globalThis.__TS_TRACE_NAMESPACES = "UserService:*"
```

Code that relied on logs being emitted without any configuration must now opt in explicitly.


## [0.1.0]

### Added

- `@LogMethod(options?)` — `[CALL]`, `[RESULT]` and `[ERROR]` logs for sync and async methods.
- `@LogPerformance(options?)` — execution duration via `performance.now()` with a slow-call warning (`slowThresholdMs`).
- `@LogClass(options?)` — class-wide decoration with `include` / `exclude` method filters and grouped trace output.
- `sanitize(value, options?)` — recursive sensitive-data masking (`***MASKED***`).
- Runtime toggle via `globalThis.IS_DEBUG_ENABLED` / `globalThis.DEBUG_CONFIG`.
- Namespace filtering via `globalThis.DEBUG_NAMESPACES` (`auth:*`, `-auth:sensitive`).
