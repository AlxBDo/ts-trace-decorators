import { wrapLogMethod } from "./log-method.js";
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
export function LogClass(options = {}) {
    return function (target, _context) {
        const prototype = target.prototype;
        for (const methodName of Object.getOwnPropertyNames(prototype)) {
            if (methodName === "constructor") {
                continue;
            }
            if (!isMethodSelected(methodName, options.includeMethods, options.excludeMethods)) {
                continue;
            }
            const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
            if (!descriptor || typeof descriptor.value !== "function") {
                continue;
            }
            Object.defineProperty(prototype, methodName, {
                ...descriptor,
                value: wrapLogMethod(descriptor.value, methodName, options),
            });
        }
        return target;
    };
}
//# sourceMappingURL=log-class.js.map