export type LogLevel = "log" | "table" | "warn" | "error";

export interface LoggerLike {
  log: (...args: unknown[]) => void;
  table: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (...args: unknown[]) => void;
  groupCollapsed: (...args: unknown[]) => void;
  groupEnd: () => void;
}

export interface RuntimeDebugConfig {
  enabled?: boolean;
  namespaces?: string;
}

export interface LogContext {
  instance: unknown;
  args: unknown[];
  result?: unknown;
  error?: unknown;
  durationMs?: number;
  namespace: string;
  methodName: string;
}

export type CustomLogHandler = (payload: LogContext) => unknown;

export interface TraceEvent {
  status: "CALL" | "RESULT" | "ERROR" | "PERFORMANCE";
  payload: unknown;
  timestamp: string;
}

export interface CommonLogOptions {
  enabled?: boolean;
  namespaces?: string;
  namespace?: string;
  logger?: Partial<LoggerLike>;
  logLevel?: LogLevel;
  traceMode?: "inline" | "grouped" | "both";
  tag?: string;
  customLog?: CustomLogHandler;
}

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

export function getRuntimeConfig(): RuntimeDebugConfig {
  const source = globalThis as typeof globalThis & {
    IS_DEBUG_ENABLED?: boolean;
    DEBUG_CONFIG?: RuntimeDebugConfig;
    DEBUG_NAMESPACES?: string;
  };

  return {
    enabled: source.DEBUG_CONFIG?.enabled ?? source.IS_DEBUG_ENABLED,
    namespaces: source.DEBUG_CONFIG?.namespaces ?? source.DEBUG_NAMESPACES,
  };
}

export function shouldEnableDebug(optionEnabled?: boolean): boolean {
  if (typeof optionEnabled === "boolean") {
    return optionEnabled;
  }

  const runtime = getRuntimeConfig();
  return runtime.enabled !== false;
}
