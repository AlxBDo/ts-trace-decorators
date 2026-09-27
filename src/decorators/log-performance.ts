import { getLogger } from "../config.js";
import type { CommonLogOptions, LogContext, TraceEvent } from "../types/index.js";
import { formatLabel, resolveDebugContext } from "../utils/debug-context.js";
import { enterScope, exitScope, pushEvent, type TraceScope } from "../utils/trace-scope.js";

export interface LogPerformanceOptions extends CommonLogOptions {
  slowThresholdMs?: number;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "then" in value &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

function emitPerformance(
  options: LogPerformanceOptions,
  namespace: string,
  tag: string,
  correlationId: string | undefined,
  durationMs: number,
  trace: TraceEvent[] | undefined,
  error?: unknown,
): void {
  const logger = getLogger(options.logger);
  const label = formatLabel(namespace, correlationId);
  const payload = { durationMs, trace, error };

  if (
    (options.traceMode === "grouped" || options.traceMode === "both") &&
    trace
  ) {
    logger.groupCollapsed(`Debug #${formatLabel(tag, correlationId)}`);
    logger.log({ namespace, correlationId, ...payload });
    logger.groupEnd();
  }

  if (options.traceMode !== "grouped") {
    logger.log(`[PERFORMANCE] ${label}`, { durationMs, error });
  }

  if (
    typeof options.slowThresholdMs === "number" &&
    durationMs > options.slowThresholdMs
  ) {
    logger.warn(`[SLOW] ${label} exceeded ${options.slowThresholdMs}ms`, {
      durationMs,
      error,
    });
  }
}

function runCustomLogSafely(
  options: LogPerformanceOptions,
  payload: LogContext,
  scope: TraceScope,
): void {
  if (!options.customLog) {
    return;
  }

  try {
    options.customLog(payload);
  } catch (customLogError) {
    pushEvent(scope, {
      status: "ERROR",
      payload: { customLogError },
      timestamp: new Date().toISOString(),
    });
  }
}

export function LogPerformance(options: LogPerformanceOptions = {}) {
  return function <TThis, TArgs extends unknown[], TReturn>(
    target: (this: TThis, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TReturn>,
  ) {
    const methodName = String(context.name);

    return function (this: TThis, ...args: TArgs): TReturn {
      const debugContext = resolveDebugContext(this, methodName, options, args);
      if (!debugContext.shouldLog) {
        return target.apply(this, args);
      }

      const { namespace, tag, correlationId } = debugContext;
      const scope = enterScope(correlationId);
      const startedAt = nowMs();

      try {
        const executionResult = target.apply(this, args);

        if (isPromiseLike(executionResult)) {
          return Promise.resolve(executionResult)
            .then((resolved) => {
              const durationMs = nowMs() - startedAt;
              pushEvent(scope, {
                status: "PERFORMANCE",
                payload: { durationMs, namespace },
                timestamp: new Date().toISOString(),
              });

              runCustomLogSafely(
                options,
                {
                  instance: this,
                  args,
                  result: resolved,
                  durationMs,
                  namespace,
                  methodName,
                  correlationId,
                },
                scope,
              );

              emitPerformance(
                options,
                namespace,
                tag,
                correlationId,
                durationMs,
                exitScope(scope, correlationId),
              );
              return resolved;
            })
            .catch((error: unknown) => {
              const durationMs = nowMs() - startedAt;
              pushEvent(scope, {
                status: "PERFORMANCE",
                payload: { durationMs, error, namespace },
                timestamp: new Date().toISOString(),
              });

              runCustomLogSafely(
                options,
                {
                  instance: this,
                  args,
                  error,
                  durationMs,
                  namespace,
                  methodName,
                  correlationId,
                },
                scope,
              );

              emitPerformance(
                options,
                namespace,
                tag,
                correlationId,
                durationMs,
                exitScope(scope, correlationId),
                error,
              );
              throw error;
            }) as TReturn;
        }

        const durationMs = nowMs() - startedAt;
        pushEvent(scope, {
          status: "PERFORMANCE",
          payload: { durationMs, namespace },
          timestamp: new Date().toISOString(),
        });

        runCustomLogSafely(
          options,
          {
            instance: this,
            args,
            result: executionResult,
            durationMs,
            namespace,
            methodName,
            correlationId,
          },
          scope,
        );

        emitPerformance(
          options,
          namespace,
          tag,
          correlationId,
          durationMs,
          exitScope(scope, correlationId),
        );
        return executionResult;
      } catch (error) {
        const durationMs = nowMs() - startedAt;
        pushEvent(scope, {
          status: "PERFORMANCE",
          payload: { durationMs, error, namespace },
          timestamp: new Date().toISOString(),
        });

        runCustomLogSafely(
          options,
          {
            instance: this,
            args,
            error,
            durationMs,
            namespace,
            methodName,
            correlationId,
          },
          scope,
        );

        emitPerformance(
          options,
          namespace,
          tag,
          correlationId,
          durationMs,
          exitScope(scope, correlationId),
          error,
        );
        throw error;
      }
    };
  };
}
