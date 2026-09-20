import { getLogger, getRuntimeConfig, shouldEnableDebug, } from "../config.js";
import { resolveNamespace, shouldLogNamespace } from "../utils/namespace.js";
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
export function LogMethod(options = {}) {
    return function (target, context) {
        const methodName = String(context.name);
        return function (...args) {
            if (!shouldEnableDebug(options.enabled)) {
                return target.apply(this, args);
            }
            const runtimeConfig = getRuntimeConfig();
            const className = this?.constructor?.name ??
                "AnonymousClass";
            const namespace = resolveNamespace(className, methodName, options.namespace);
            const namespacesMask = options.namespaces ?? runtimeConfig.namespaces;
            if (!shouldLogNamespace(namespace, namespacesMask)) {
                return target.apply(this, args);
            }
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
                    return executionResult
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
                        .catch((err) => {
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
                    });
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
                    trace.push({
                        status: "RESULT",
                        payload,
                        timestamp: new Date().toISOString(),
                    });
                    if (mode === "inline" || mode === "both") {
                        emitInlineLog("RESULT", namespace, payload, options);
                    }
                }
                finalize(sanitize(executionResult, options), undefined);
                return executionResult;
            }
            catch (err) {
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
            }
        };
    };
}
//# sourceMappingURL=log-method.js.map