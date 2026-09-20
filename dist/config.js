const DEFAULT_LOGGER = {
    log: (...args) => console.log(...args),
    table: (...args) => console.table(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    group: (...args) => console.group(...args),
    groupCollapsed: (...args) => console.groupCollapsed(...args),
    groupEnd: () => console.groupEnd(),
};
export function getLogger(overrides) {
    return { ...DEFAULT_LOGGER, ...overrides };
}
export function getRuntimeConfig() {
    const source = globalThis;
    return {
        enabled: source.DEBUG_CONFIG?.enabled ?? source.IS_DEBUG_ENABLED,
        namespaces: source.DEBUG_CONFIG?.namespaces ?? source.DEBUG_NAMESPACES,
    };
}
export function shouldEnableDebug(optionEnabled) {
    if (typeof optionEnabled === "boolean") {
        return optionEnabled;
    }
    const runtime = getRuntimeConfig();
    return runtime.enabled !== false;
}
//# sourceMappingURL=config.js.map