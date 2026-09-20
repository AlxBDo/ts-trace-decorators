import { type LogMethodOptions, wrapLogMethod } from "./log-method.js";

export interface LogClassOptions extends LogMethodOptions {
  includeMethods?: Array<string | RegExp>;
  excludeMethods?: Array<string | RegExp>;
}

const WRAPPED_METHOD_MARKER = Symbol("ts-debug-decorators:wrapped");

type WrappedMethod = ((...args: unknown[]) => unknown) & {
  [WRAPPED_METHOD_MARKER]?: boolean;
};

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

function wrapPrototypeMethods(
  sourcePrototype: Record<string, unknown>,
  decoratedPrototype: Record<string, unknown>,
  sourceClassName: string,
  options: LogClassOptions,
): void {
  for (const methodName of Object.getOwnPropertyNames(sourcePrototype)) {
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

    const descriptor = Object.getOwnPropertyDescriptor(sourcePrototype, methodName);
    if (!descriptor || typeof descriptor.value !== "function") {
      continue;
    }

    const current = descriptor.value as WrappedMethod;
    if (current[WRAPPED_METHOD_MARKER]) {
      Object.defineProperty(decoratedPrototype, methodName, descriptor);
      continue;
    }

    const wrapped = wrapLogMethod(current, methodName, {
      ...options,
      namespace: options.namespace ?? `${sourceClassName}:${methodName}`,
    }) as WrappedMethod;
    wrapped[WRAPPED_METHOD_MARKER] = true;

    Object.defineProperty(decoratedPrototype, methodName, {
      ...descriptor,
      value: wrapped,
    });
  }
}

export function LogClass(options: LogClassOptions = {}) {
  return function <TClass extends new (...args: any[]) => object>(
    target: TClass,
    _context: ClassDecoratorContext<TClass>,
  ): TClass {
    const Decorated = class extends target {};

    wrapPrototypeMethods(
      target.prototype as Record<string, unknown>,
      Decorated.prototype as Record<string, unknown>,
      target.name,
      options,
    );

    return Decorated as TClass;
  };
}
