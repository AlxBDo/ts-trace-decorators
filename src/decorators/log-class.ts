import { type LogMethodOptions, wrapLogMethod } from "./log-method.js";

export interface LogClassOptions extends LogMethodOptions {
  includeMethods?: Array<string | RegExp>;
  excludeMethods?: Array<string | RegExp>;
}

function isMethodSelected(
  methodName: string,
  includeMethods?: Array<string | RegExp>,
  excludeMethods?: Array<string | RegExp>,
): boolean {
  const included =
    !includeMethods ||
    includeMethods.length === 0 ||
    includeMethods.some((pattern) =>
      typeof pattern === "string"
        ? pattern === methodName
        : pattern.test(methodName),
    );

  if (!included) {
    return false;
  }

  if (!excludeMethods || excludeMethods.length === 0) {
    return true;
  }

  return !excludeMethods.some((pattern) =>
    typeof pattern === "string" ? pattern === methodName : pattern.test(methodName),
  );
}

export function LogClass(options: LogClassOptions = {}) {
  return function <TClass extends abstract new (...args: never[]) => object>(
    target: TClass,
    _context: ClassDecoratorContext<TClass>,
  ): TClass {
    const prototype = target.prototype as Record<string, unknown>;

    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === "constructor") {
        continue;
      }

      if (
        !isMethodSelected(
          methodName,
          options.includeMethods,
          options.excludeMethods,
        )
      ) {
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
