import { getLogger } from "../config.js";
import type {
  CommonLogOptions,
  LogContext,
  TraceEvent,
  TraceStatus,
} from "../types/index.js";
import { formatLabel, resolveDebugContext } from "../utils/debug-context.js";
import {
  enterScope,
  exitScope,
  pushEvent,
  type TraceScope,
} from "../utils/trace-scope.js";
import { sanitize, type SanitizeOptions } from "../utils/sanitize.js";

export interface LogMethodOptions extends CommonLogOptions, SanitizeOptions {
  call?: boolean;
  result?: boolean;
  error?: boolean;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "then" in value &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

function runCustomLog(options: LogMethodOptions, payload: LogContext): unknown {
  if (!options.customLog) {
    return undefined;
  }

  try {
    return options.customLog(payload);
  } catch (error) {
    return { customLogError: error };
  }
}

function emitInlineLog(
  status: Exclude<TraceStatus, "PERFORMANCE">,
  label: string,
  payload: unknown,
  options: LogMethodOptions,
): void {
  const logger = getLogger(options.logger);

  if (status === "ERROR") {
    logger.error(`[ERROR] ${label}`, payload);
    return;
  }

  const level = options.logLevel ?? "log";
  logger[level](`[${status}] ${label}`, payload);
}

function emitGroupedTrace(
  namespace: string,
  tag: string,
  correlationId: string | undefined,
  options: LogMethodOptions,
  trace: TraceEvent[],
  truncated: boolean,
  result: unknown,
  error: unknown,
): void {
  const logger = getLogger(options.logger);

  logger.groupCollapsed(`Debug #${formatLabel(tag, correlationId)}`);
  logger.log({
    namespace,
    correlationId,
    trace,
    ...(truncated ? { truncated } : {}),
    result,
    error,
  });
  logger.groupEnd();
}

export function wrapLogMethod<TThis, TArgs extends unknown[], TReturn>(
  target: (this: TThis, ...args: TArgs) => TReturn,
  methodName: string,
  options: LogMethodOptions,
): (this: TThis, ...args: TArgs) => TReturn {
  return function (this: TThis, ...args: TArgs): TReturn {
    const debugContext = resolveDebugContext(this, methodName, options, args);
    if (!debugContext.shouldLog) {
      return target.apply(this, args);
    }

    const { namespace, tag, correlationId } = debugContext;
    const label = formatLabel(namespace, correlationId);

    const mode = options.traceMode ?? "inline";
    const scope: TraceScope = enterScope(correlationId);
    const sanitizedArgs = sanitize(args, options);

    const record = (status: TraceStatus, payload: unknown): void => {
      pushEvent(scope, {
        status,
        payload,
        timestamp: new Date().toISOString(),
      });
    };

    if (options.call !== false) {
      const payload = { args: sanitizedArgs, namespace };
      record("CALL", payload);

      if (mode === "inline" || mode === "both") {
        emitInlineLog("CALL", label, payload, options);
      }
    }

    const finalize = (result: unknown, error: unknown): void => {
      const aggregated = exitScope(scope, correlationId);

      if (!aggregated || (mode !== "grouped" && mode !== "both")) {
        return;
      }

      emitGroupedTrace(
        namespace,
        tag,
        correlationId,
        options,
        aggregated,
        scope.truncated,
        result,
        error,
      );
    };

    try {
      const executionResult = target.apply(this, args);

      if (isPromiseLike(executionResult)) {
        return Promise.resolve(executionResult)
          .then((resolved) => {
            const sanitizedResult = sanitize(resolved, options);

            if (options.result !== false) {
              const payload = {
                result: sanitizedResult,
                namespace,
                custom: runCustomLog(options, {
                  instance: this,
                  args,
                  result: resolved,
                  namespace,
                  methodName,
                  correlationId,
                }),
              };
              record("RESULT", payload);

              if (mode === "inline" || mode === "both") {
                emitInlineLog("RESULT", label, payload, options);
              }
            }

            finalize(sanitizedResult, undefined);
            return resolved;
          })
          .catch((err: unknown) => {
            const sanitizedError = sanitize(err, options);

            if (options.error !== false) {
              const payload = {
                error: sanitizedError,
                namespace,
                custom: runCustomLog(options, {
                  instance: this,
                  args,
                  error: err,
                  namespace,
                  methodName,
                  correlationId,
                }),
              };
              record("ERROR", payload);

              if (mode === "inline" || mode === "both") {
                emitInlineLog("ERROR", label, payload, options);
              }
            }

            finalize(undefined, sanitizedError);
            throw err;
          }) as TReturn;
      }

      const sanitizedResult = sanitize(executionResult, options);

      if (options.result !== false) {
        const payload = {
          result: sanitizedResult,
          namespace,
          custom: runCustomLog(options, {
            instance: this,
            args,
            result: executionResult,
            namespace,
            methodName,
            correlationId,
          }),
        };
        record("RESULT", payload);

        if (mode === "inline" || mode === "both") {
          emitInlineLog("RESULT", label, payload, options);
        }
      }

      finalize(sanitizedResult, undefined);
      return executionResult;
    } catch (err) {
      const sanitizedError = sanitize(err, options);

      if (options.error !== false) {
        const payload = {
          error: sanitizedError,
          namespace,
          custom: runCustomLog(options, {
            instance: this,
            args,
            error: err,
            namespace,
            methodName,
            correlationId,
          }),
        };
        record("ERROR", payload);

        if (mode === "inline" || mode === "both") {
          emitInlineLog("ERROR", label, payload, options);
        }
      }

      finalize(undefined, sanitizedError);
      throw err;
    }
  };
}

export function LogMethod(options: LogMethodOptions = {}) {
  return function <TThis, TArgs extends unknown[], TReturn>(
    target: (this: TThis, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TReturn>,
  ) {
    return wrapLogMethod(target, String(context.name), options);
  };
}
