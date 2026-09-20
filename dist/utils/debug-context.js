import { getRuntimeConfig, shouldEnableDebug } from "../config.js";
import { resolveNamespace, shouldLogNamespace } from "./namespace.js";
function getClassName(instance) {
    return (instance?.constructor?.name ??
        "AnonymousClass");
}
export function resolveDebugContext(instance, methodName, options) {
    const namespace = resolveNamespace(getClassName(instance), methodName, options.namespace);
    if (!shouldEnableDebug(options.enabled)) {
        return { shouldLog: false, namespace };
    }
    const runtimeConfig = getRuntimeConfig();
    const namespacesMask = options.namespaces ?? runtimeConfig.namespaces;
    return {
        shouldLog: shouldLogNamespace(namespace, namespacesMask),
        namespace,
    };
}
//# sourceMappingURL=debug-context.js.map