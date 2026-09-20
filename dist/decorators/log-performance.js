import { getLogger, } from "../config.js";
import { resolveDebugContext } from "../utils/debug-context.js";
function nowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
    }
    return Date.now();
}
function isPromiseLike(value) {
    return (value !== null &&
        typeof value === "object" &&
        "then" in value &&
        typeof value.then === "function");
}
function emitPerformance(options, namespace, durationMs, trace, error) {
    const logger = getLogger(options.logger);
    const payload = { durationMs, trace, error };
    if (options.traceMode === "grouped" || options.traceMode === "both") {
        const tag = options.tag ?? namespace;
        logger.groupCollapsed(`Debug #${tag}`);
        logger.log({ namespace, ...payload });
        logger.groupEnd();
    }
    if (options.traceMode !== "grouped") {
        logger.log(`[PERFORMANCE] ${namespace}`, payload);
    }
    if (typeof options.slowThresholdMs === "number" &&
        durationMs > options.slowThresholdMs) {
        logger.warn(`[SLOW] ${namespace} exceeded ${options.slowThresholdMs}ms`, payload);
    }
}
export function LogPerformance(options = {}) {
    return function (target, context) {
        const methodName = String(context.name);
        return function (...args) {
            const debugContext = resolveDebugContext(this, methodName, options);
            if (!debugContext.shouldLog) {
                return target.apply(this, args);
            }
            const { namespace } = debugContext;
            const trace = [];
            const startedAt = nowMs();
            try {
                const executionResult = target.apply(this, args);
                if (isPromiseLike(executionResult)) {
                    return Promise.resolve(executionResult)
                        .then((resolved) => {
                        const durationMs = nowMs() - startedAt;
                        trace.push({
                            status: "PERFORMANCE",
                            payload: { durationMs },
                            timestamp: new Date().toISOString(),
                        });
                        options.customLog?.({
                            instance: this,
                            args,
                            result: resolved,
                            durationMs,
                            namespace,
                            methodName,
                        });
                        emitPerformance(options, namespace, durationMs, trace);
                        return resolved;
                    })
                        .catch((error) => {
                        const durationMs = nowMs() - startedAt;
                        trace.push({
                            status: "PERFORMANCE",
                            payload: { durationMs, error },
                            timestamp: new Date().toISOString(),
                        });
                        options.customLog?.({
                            instance: this,
                            args,
                            error,
                            durationMs,
                            namespace,
                            methodName,
                        });
                        emitPerformance(options, namespace, durationMs, trace, error);
                        throw error;
                    });
                }
                const durationMs = nowMs() - startedAt;
                trace.push({
                    status: "PERFORMANCE",
                    payload: { durationMs },
                    timestamp: new Date().toISOString(),
                });
                options.customLog?.({
                    instance: this,
                    args,
                    result: executionResult,
                    durationMs,
                    namespace,
                    methodName,
                });
                emitPerformance(options, namespace, durationMs, trace);
                return executionResult;
            }
            catch (error) {
                const durationMs = nowMs() - startedAt;
                trace.push({
                    status: "PERFORMANCE",
                    payload: { durationMs, error },
                    timestamp: new Date().toISOString(),
                });
                options.customLog?.({
                    instance: this,
                    args,
                    error,
                    durationMs,
                    namespace,
                    methodName,
                });
                emitPerformance(options, namespace, durationMs, trace, error);
                throw error;
            }
        };
    };
}
//# sourceMappingURL=log-performance.js.map