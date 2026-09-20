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

export interface SanitizeOptions {
  mask?: string;
  sensitiveKeys?: string[];
}

export function sanitize<T>(
  input: T,
  options: SanitizeOptions = {},
  seen = new WeakSet<object>(),
): T {
  if (input === null || typeof input !== "object") {
    return input;
  }

  if (seen.has(input as object)) {
    return "[Circular]" as T;
  }

  seen.add(input as object);
  const mask = options.mask ?? "***MASKED***";
  const sensitive = new Set(
    (options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS).map((key) =>
      key.toLowerCase(),
    ),
  );

  if (Array.isArray(input)) {
    return input.map((item) => sanitize(item, options, seen)) as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (sensitive.has(key.toLowerCase())) {
      output[key] = mask;
      continue;
    }

    output[key] = sanitize(value, options, seen);
  }

  return output as T;
}
