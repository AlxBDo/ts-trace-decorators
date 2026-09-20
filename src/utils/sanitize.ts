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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isErrorObject(value: unknown): value is Error {
  return value instanceof Error;
}

function sanitizeInternal<T>(
  input: T,
  mask: string,
  sensitiveKeys: Set<string>,
  inProgress: WeakSet<object>,
  memo: WeakMap<object, unknown>,
): T {
  if (input === null || typeof input !== "object") {
    return input;
  }

  const isTraversable =
    Array.isArray(input) || isPlainObject(input) || isErrorObject(input);
  if (!isTraversable) {
    return input;
  }

  const source = input as object;
  if (inProgress.has(source)) {
    return "[Circular]" as T;
  }

  if (memo.has(source)) {
    return memo.get(source) as T;
  }

  inProgress.add(source);

  if (Array.isArray(input)) {
    const output: unknown[] = [];
    memo.set(source, output);

    for (const item of input) {
      output.push(sanitizeInternal(item, mask, sensitiveKeys, inProgress, memo));
    }

    inProgress.delete(source);
    return output as T;
  }

  const rawObject = isErrorObject(input)
    ? Object.fromEntries(
        Object.getOwnPropertyNames(input).map((key) => [
          key,
          (input as Record<string, unknown>)[key],
        ]),
      )
    : (input as Record<string, unknown>);

  const output: Record<string, unknown> = {};
  memo.set(source, output);

  for (const [key, value] of Object.entries(rawObject)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      output[key] = mask;
      continue;
    }

    output[key] = sanitizeInternal(value, mask, sensitiveKeys, inProgress, memo);
  }

  inProgress.delete(source);
  return output as T;
}

export function sanitize<T>(input: T, options: SanitizeOptions = {}): T {
  const mask = options.mask ?? "***MASKED***";
  const sensitiveKeys = new Set(
    (options.sensitiveKeys ?? DEFAULT_SENSITIVE_KEYS).map((key) => key.toLowerCase()),
  );

  return sanitizeInternal(
    input,
    mask,
    sensitiveKeys,
    new WeakSet<object>(),
    new WeakMap<object, unknown>(),
  );
}
