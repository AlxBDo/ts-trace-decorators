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
export function sanitize(input, options = {}, seen = new WeakSet()) {
    if (input === null || typeof input !== "object") {
        return input;
    }
    if (seen.has(input)) {
        return "[Circular]";
    }
    seen.add(input);
    const mask = options.mask ?? "***MASKED***";
    const sensitive = new Set((options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS).map((key) => key.toLowerCase()));
    if (Array.isArray(input)) {
        return input.map((item) => sanitize(item, options, seen));
    }
    const output = {};
    for (const [key, value] of Object.entries(input)) {
        if (sensitive.has(key.toLowerCase())) {
            output[key] = mask;
            continue;
        }
        output[key] = sanitize(value, options, seen);
    }
    return output;
}
//# sourceMappingURL=sanitize.js.map