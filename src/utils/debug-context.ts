import { getRuntimeConfig, shouldEnableDebug } from "../config.js";
import { resolveNamespace, shouldLogNamespace } from "./namespace.js";

interface DebugContextOptions {
  enabled?: boolean;
  namespaces?: string;
  namespace?: string;
}

export interface ResolvedDebugContext {
  shouldLog: boolean;
  namespace: string;
}

function getClassName(instance: unknown): string {
  return (
    (instance as { constructor?: { name?: string } } | null)?.constructor?.name ??
    "AnonymousClass"
  );
}

export function resolveDebugContext(
  instance: unknown,
  methodName: string,
  options: DebugContextOptions,
): ResolvedDebugContext {
  const namespace = resolveNamespace(
    getClassName(instance),
    methodName,
    options.namespace,
  );

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
