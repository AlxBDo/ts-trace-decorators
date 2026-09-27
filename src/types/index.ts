export type LogLevel = "log" | "table" | "warn" | "error";

export type TraceMode = "inline" | "grouped" | "both";

export type TraceStatus = "CALL" | "RESULT" | "ERROR" | "PERFORMANCE";

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
  correlationId?: string;
}

export type CustomLogHandler = (payload: LogContext) => unknown;

export interface TraceEvent {
  status: TraceStatus;
  payload: unknown;
  timestamp: string;
}

/**
 * Runtime information handed to `tag` / `correlationId` resolvers so they can
 * derive a label from the decorated instance instead of a static value.
 */
export interface TraceResolverContext {
  instance: unknown;
  className: string;
  methodName: string;
  args: unknown[];
}

export type TraceValueResolver = (
  context: TraceResolverContext,
) => string | undefined;

export type TraceValue = string | TraceValueResolver;

/**
 * Per-instance overrides read from the `TRACE_CONFIG` symbol. They take
 * precedence over the global runtime configuration but stay below explicit
 * decorator options.
 */
export interface TraceInstanceConfig {
  enabled?: boolean;
  namespaces?: string;
  tag?: string;
  correlationId?: string;
}

export interface CommonLogOptions {
  enabled?: boolean;
  namespaces?: string;
  namespace?: string;
  logger?: Partial<LoggerLike>;
  logLevel?: LogLevel;
  traceMode?: TraceMode;
  tag?: TraceValue;
  correlationId?: TraceValue;
  customLog?: CustomLogHandler;
}
