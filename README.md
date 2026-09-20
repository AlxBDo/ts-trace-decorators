# ts-debug-decorators

Décorateurs TypeScript (TS 5.0+ / Stage 3) pour le logging d'exécution, la mesure de performance et la traçabilité.

## Installation

```bash
npm install ts-debug-decorators
```

## API

- `@LogMethod(options?)`
- `@LogPerformance(options?)`
- `@LogClass(options?)`
- `sanitize(value, options?)`

## Features principales

- Logs `[CALL]`, `[RESULT]`, `[ERROR]` pour méthodes sync/async
- Mesure de durée avec `performance.now()` et alerte lenteur (`slowThresholdMs`)
- Obfuscation récursive des clés sensibles (`***MASKED***`)
- Toggle runtime via `globalThis.IS_DEBUG_ENABLED` ou `globalThis.DEBUG_CONFIG`
- Filtrage namespace via `globalThis.DEBUG_NAMESPACES` (`auth:*`, `-auth:sensitive`)
- Personnalisation de sortie console (`log`, `table`, `warn`, `error`, `group`)
- Mode de traces groupées avec sortie `Debug #tag`

## Exemple rapide

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
