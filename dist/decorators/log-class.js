import { wrapLogMethod } from "./log-method.js";
const WRAPPED_METHOD_MARKER = Symbol("ts-debug-decorators:wrapped");
function isMethodSelected(methodName, includeMethods, excludeMethods) {
    const included = !includeMethods ||
        includeMethods.length === 0 ||
        includeMethods.some((pattern) => typeof pattern === "string"
            ? pattern === methodName
            : pattern.test(methodName));
    if (!included) {
        return false;
    }
    if (!excludeMethods || excludeMethods.length === 0) {
        return true;
    }
    return !excludeMethods.some((pattern) => typeof pattern === "string" ? pattern === methodName : pattern.test(methodName));
}
function wrapPrototypeMethods(sourcePrototype, decoratedPrototype, sourceClassName, options) {
    for (const methodName of Object.getOwnPropertyNames(sourcePrototype)) {
        if (methodName === "constructor") {
            continue;
        }
        if (!isMethodSelected(methodName, options.includeMethods, options.excludeMethods)) {
            continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(sourcePrototype, methodName);
        if (!descriptor || typeof descriptor.value !== "function") {
            continue;
        }
        const current = descriptor.value;
        if (current[WRAPPED_METHOD_MARKER]) {
            Object.defineProperty(decoratedPrototype, methodName, descriptor);
            continue;
        }
        const wrapped = wrapLogMethod(current, methodName, {
            ...options,
            namespace: options.namespace ?? `${sourceClassName}:${methodName}`,
        });
        wrapped[WRAPPED_METHOD_MARKER] = true;
        Object.defineProperty(decoratedPrototype, methodName, {
            ...descriptor,
            value: wrapped,
        });
    }
}
export function LogClass(options = {}) {
    return function (target, _context) {
        const Decorated = class extends target {
        };
        wrapPrototypeMethods(target.prototype, Decorated.prototype, target.name, options);
        return Decorated;
    };
}
//# sourceMappingURL=log-class.js.map