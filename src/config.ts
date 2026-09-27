import type {
  LoggerLike,
  RuntimeDebugConfig,
  TraceInstanceConfig,
} from "./types/index.js";

export type {
  CommonLogOptions,
  CustomLogHandler,
  LogContext,
  LogLevel,
  LoggerLike,
  RuntimeDebugConfig,
  TraceEvent,
  TraceInstanceConfig,
  TraceMode,
  TraceResolverContext,
  TraceStatus,
  TraceValue,
  TraceValueResolver,
} from "./types/index.js";

/**
 * Attach a `TraceInstanceConfig` to any instance to drive tracing per object
 * rather than globally. Declared through `Symbol.for` so duplicated copies of
 * the package in a dependency tree still resolve the same key.
 */
export const TRACE_CONFIG = Symbol.for("ts-trace-decorators.config");

const DEFAULT_LOGGER: LoggerLike = {
  log: (...args) => console.log(...args),
  table: (...args) => console.table(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  group: (...args) => console.group(...args),
  groupCollapsed: (...args) => console.groupCollapsed(...args),
  groupEnd: () => console.groupEnd(),
};

export function getLogger(overrides?: Partial<LoggerLike>): LoggerLike {
  return { ...DEFAULT_LOGGER, ...overrides };
}

interface TraceGlobals {
  __TS_TRACE_ENABLED?: boolean;
  __TS_TRACE_CONFIG?: RuntimeDebugConfig;
  __TS_TRACE_NAMESPACES?: string;
  /** @deprecated unprefixed globals are collision-prone; kept for migration. */
  IS_DEBUG_ENABLED?: boolean;
  /** @deprecated use `__TS_TRACE_CONFIG`. */
  DEBUG_CONFIG?: RuntimeDebugConfig;
  /** @deprecated use `__TS_TRACE_NAMESPACES`. */
  DEBUG_NAMESPACES?: string;
}

export function getRuntimeConfig(): RuntimeDebugConfig {
  const source = globalThis as typeof globalThis & TraceGlobals;

  return {
    enabled:
      source.__TS_TRACE_CONFIG?.enabled ??
      source.__TS_TRACE_ENABLED ??
      source.DEBUG_CONFIG?.enabled ??
      source.IS_DEBUG_ENABLED,
    namespaces:
      source.__TS_TRACE_CONFIG?.namespaces ??
      source.__TS_TRACE_NAMESPACES ??
      source.DEBUG_CONFIG?.namespaces ??
      source.DEBUG_NAMESPACES,
  };
}

export function getInstanceConfig(
  instance: unknown,
): TraceInstanceConfig | undefined {
  if (
    instance === null ||
    (typeof instance !== "object" && typeof instance !== "function")
  ) {
    return undefined;
  }

  return (instance as Record<symbol, TraceInstanceConfig | undefined>)[
    TRACE_CONFIG
  ];
}

/**
 * Tracing is opt-in: without an explicit decorator option, a per-instance
 * config or a global flag set to `true`, nothing is ever logged. This keeps
 * published bundles silent — and their payloads private — by default.
 */
export function shouldEnableDebug(
  optionEnabled?: boolean,
  instanceConfig?: TraceInstanceConfig,
): boolean {
  if (typeof optionEnabled === "boolean") {
    return optionEnabled;
  }

  if (typeof instanceConfig?.enabled === "boolean") {
    return instanceConfig.enabled;
  }

  return getRuntimeConfig().enabled === true;
}
