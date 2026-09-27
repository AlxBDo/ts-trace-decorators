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

export type { LogClassOptions } from "./decorators/log-class.js";
export { LogClass } from "./decorators/log-class.js";

export type { LogMethodOptions } from "./decorators/log-method.js";
export { LogMethod } from "./decorators/log-method.js";

export type { LogPerformanceOptions } from "./decorators/log-performance.js";
export { LogPerformance } from "./decorators/log-performance.js";

export type { SanitizeOptions } from "./utils/sanitize.js";
export { DEFAULT_MAX_DEPTH, sanitize } from "./utils/sanitize.js";

export { resolveNamespace, shouldLogNamespace } from "./utils/namespace.js";
export { formatLabel } from "./utils/debug-context.js";
export { clearScopes, MAX_SCOPE_EVENTS } from "./utils/trace-scope.js";
export {
  TRACE_CONFIG,
  getInstanceConfig,
  getLogger,
  getRuntimeConfig,
  shouldEnableDebug,
} from "./config.js";
