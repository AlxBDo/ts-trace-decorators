const DEFAULT_SENSITIVE_KEYS = [
    "password",
    "token",
    "secret",
    "authorization",
    "creditcard",
    "apikey",
    "accesskey",
    "privatekey",
    "sessionid",
];
function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function isErrorObject(value) {
    return value instanceof Error;
}
function sanitizeInternal(input, mask, sensitiveKeys, inProgress, memo) {
    if (input === null || typeof input !== "object") {
        return input;
    }
    const isTraversable = Array.isArray(input) || isPlainObject(input) || isErrorObject(input);
    if (!isTraversable) {
        return input;
    }
    const source = input;
    if (inProgress.has(source)) {
        return "[Circular]";
    }
    if (memo.has(source)) {
        return memo.get(source);
    }
    inProgress.add(source);
    if (Array.isArray(input)) {
        const output = [];
        memo.set(source, output);
        for (const item of input) {
            output.push(sanitizeInternal(item, mask, sensitiveKeys, inProgress, memo));
        }
        inProgress.delete(source);
        return output;
    }
    const rawObject = isErrorObject(input)
        ? Object.fromEntries(Object.getOwnPropertyNames(input).map((key) => [
            key,
            input[key],
        ]))
        : input;
    const output = {};
    memo.set(source, output);
    for (const [key, value] of Object.entries(rawObject)) {
        if (sensitiveKeys.has(key.toLowerCase())) {
            output[key] = mask;
            continue;
        }
        output[key] = sanitizeInternal(value, mask, sensitiveKeys, inProgress, memo);
    }
    inProgress.delete(source);
    return output;
}
export function sanitize(input, options = {}) {
    const mask = options.mask ?? "***MASKED***";
    const sensitiveKeys = new Set((options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS).map((key) => key.toLowerCase()));
    return sanitizeInternal(input, mask, sensitiveKeys, new WeakSet(), new WeakMap());
}
//# sourceMappingURL=sanitize.js.map