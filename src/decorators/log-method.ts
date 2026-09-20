import {
  type CommonLogOptions,
  type LogContext,
  type TraceEvent,
  getLogger,
  getRuntimeConfig,
  shouldEnableDebug,
} from "../config.js";
import { resolveNamespace, shouldLogNamespace } from "../utils/namespace.js";
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
  status: "CALL" | "RESULT" | "ERROR",
  namespace: string,
  payload: unknown,
  options: LogMethodOptions,
): void {
  const logger = getLogger(options.logger);

  if (status === "ERROR") {
    logger.error(`[ERROR] ${namespace}`, payload);
    return;
  }

  const level = options.logLevel ?? "log";
  logger[level](`[${status}] ${namespace}`, payload);
}

function emitGroupedTrace(
  namespace: string,
  options: LogMethodOptions,
  trace: TraceEvent[],
  result: unknown,
  error: unknown,
): void {
  const logger = getLogger(options.logger);
  const tag = options.tag ?? namespace;

  logger.groupCollapsed(`Debug #${tag}`);
  logger.log({ namespace, trace, result, error });
  logger.groupEnd();
}

export function wrapLogMethod<TThis, TArgs extends unknown[], TReturn>(
  target: (this: TThis, ...args: TArgs) => TReturn,
  methodName: string,
  options: LogMethodOptions,
): (this: TThis, ...args: TArgs) => TReturn {
  return function (this: TThis, ...args: TArgs): TReturn {
    if (!shouldEnableDebug(options.enabled)) {
      return target.apply(this, args);
    }

    const runtimeConfig = getRuntimeConfig();
    const className =
      (this as { constructor?: { name?: string } } | null)?.constructor?.name ??
      "AnonymousClass";
    const namespace = resolveNamespace(className, methodName, options.namespace);
    const namespacesMask = options.namespaces ?? runtimeConfig.namespaces;

    if (!shouldLogNamespace(namespace, namespacesMask)) {
      return target.apply(this, args);
    }

    const trace: TraceEvent[] = [];
    const mode = options.traceMode ?? "inline";
    const sanitizedArgs = sanitize(args, options);

    if (options.call !== false) {
      const payload = { args: sanitizedArgs };
      trace.push({ status: "CALL", payload, timestamp: new Date().toISOString() });

      if (mode === "inline" || mode === "both") {
        emitInlineLog("CALL", namespace, payload, options);
      }
    }

    const finalize = (result: unknown, error: unknown): void => {
      if (mode === "grouped" || mode === "both") {
        emitGroupedTrace(namespace, options, trace, result, error);
      }
    };

    try {
      const executionResult = target.apply(this, args);

      if (isPromiseLike(executionResult)) {
        return Promise.resolve(executionResult)
          .then((resolved) => {
            if (options.result !== false) {
              const payload = {
                result: sanitize(resolved, options),
                custom: runCustomLog(options, {
                  instance: this,
                  args,
                  result: resolved,
                  namespace,
                  methodName,
                }),
              };
              trace.push({
                status: "RESULT",
                payload,
                timestamp: new Date().toISOString(),
              });

              if (mode === "inline" || mode === "both") {
                emitInlineLog("RESULT", namespace, payload, options);
              }
            }

            finalize(sanitize(resolved, options), undefined);
            return resolved;
          })
          .catch((err: unknown) => {
            if (options.error !== false) {
              const payload = {
                error: sanitize(err, options),
                custom: runCustomLog(options, {
                  instance: this,
                  args,
                  error: err,
                  namespace,
                  methodName,
                }),
              };
              trace.push({
                status: "ERROR",
                payload,
                timestamp: new Date().toISOString(),
              });

              if (mode === "inline" || mode === "both") {
                emitInlineLog("ERROR", namespace, payload, options);
              }
            }

            finalize(undefined, sanitize(err, options));
            throw err;
          }) as TReturn;
      }

      if (options.result !== false) {
        const payload = {
          result: sanitize(executionResult, options),
          custom: runCustomLog(options, {
            instance: this,
            args,
            result: executionResult,
            namespace,
            methodName,
          }),
        };
        trace.push({ status: "RESULT", payload, timestamp: new Date().toISOString() });

        if (mode === "inline" || mode === "both") {
          emitInlineLog("RESULT", namespace, payload, options);
        }
      }

      finalize(sanitize(executionResult, options), undefined);
      return executionResult;
    } catch (err) {
      if (options.error !== false) {
        const payload = {
          error: sanitize(err, options),
          custom: runCustomLog(options, {
            instance: this,
            args,
            error: err,
            namespace,
            methodName,
          }),
        };
        trace.push({ status: "ERROR", payload, timestamp: new Date().toISOString() });

        if (mode === "inline" || mode === "both") {
          emitInlineLog("ERROR", namespace, payload, options);
        }
      }

      finalize(undefined, sanitize(err, options));
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
