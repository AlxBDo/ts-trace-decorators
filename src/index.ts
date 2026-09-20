export type {
  CommonLogOptions,
  CustomLogHandler,
  LogContext,
  LoggerLike,
  RuntimeDebugConfig,
  TraceEvent,
} from "./config.js";

export type { LogClassOptions } from "./decorators/log-class.js";
export { LogClass } from "./decorators/log-class.js";

export type { LogMethodOptions } from "./decorators/log-method.js";
export { LogMethod } from "./decorators/log-method.js";

export type { LogPerformanceOptions } from "./decorators/log-performance.js";
export { LogPerformance } from "./decorators/log-performance.js";

export type { SanitizeOptions } from "./utils/sanitize.js";
export { sanitize } from "./utils/sanitize.js";

export { resolveNamespace, shouldLogNamespace } from "./utils/namespace.js";
export { getLogger, getRuntimeConfig, shouldEnableDebug } from "./config.js";
