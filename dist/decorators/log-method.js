import { getLogger, } from "../config.js";
import { resolveDebugContext } from "../utils/debug-context.js";
import { sanitize } from "../utils/sanitize.js";
function isPromiseLike(value) {
    return (value !== null &&
        typeof value === "object" &&
        "then" in value &&
        typeof value.then === "function");
}
function runCustomLog(options, payload) {
    if (!options.customLog) {
        return undefined;
    }
    try {
        return options.customLog(payload);
    }
    catch (error) {
        return { customLogError: error };
    }
}
function emitInlineLog(status, namespace, payload, options) {
    const logger = getLogger(options.logger);
    if (status === "ERROR") {
        logger.error(`[ERROR] ${namespace}`, payload);
        return;
    }
    const level = options.logLevel ?? "log";
    logger[level](`[${status}] ${namespace}`, payload);
}
function emitGroupedTrace(namespace, options, trace, result, error) {
    const logger = getLogger(options.logger);
    const tag = options.tag ?? namespace;
    logger.groupCollapsed(`Debug #${tag}`);
    logger.log({ namespace, trace, result, error });
    logger.groupEnd();
}
export function wrapLogMethod(target, methodName, options) {
    return function (...args) {
        const debugContext = resolveDebugContext(this, methodName, options);
        if (!debugContext.shouldLog) {
            return target.apply(this, args);
        }
        const { namespace } = debugContext;
        const trace = [];
        const mode = options.traceMode ?? "inline";
        const sanitizedArgs = sanitize(args, options);
        if (options.call !== false) {
            const payload = { args: sanitizedArgs };
            trace.push({ status: "CALL", payload, timestamp: new Date().toISOString() });
            if (mode === "inline" || mode === "both") {
                emitInlineLog("CALL", namespace, payload, options);
            }
        }
        const finalize = (result, error) => {
            if (mode === "grouped" || mode === "both") {
                emitGroupedTrace(namespace, options, trace, result, error);
            }
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
                    finalize(sanitizedResult, undefined);
                    return resolved;
                })
                    .catch((err) => {
                    const sanitizedError = sanitize(err, options);
                    if (options.error !== false) {
                        const payload = {
                            error: sanitizedError,
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
                    finalize(undefined, sanitizedError);
                    throw err;
                });
            }
            const sanitizedResult = sanitize(executionResult, options);
            if (options.result !== false) {
                const payload = {
                    result: sanitizedResult,
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
            finalize(sanitizedResult, undefined);
            return executionResult;
        }
        catch (err) {
            const sanitizedError = sanitize(err, options);
            if (options.error !== false) {
                const payload = {
                    error: sanitizedError,
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
            finalize(undefined, sanitizedError);
            throw err;
        }
    };
}
export function LogMethod(options = {}) {
    return function (target, context) {
        return wrapLogMethod(target, String(context.name), options);
    };
}
//# sourceMappingURL=log-method.js.map