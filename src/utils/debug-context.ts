import {
  getInstanceConfig,
  getRuntimeConfig,
  shouldEnableDebug,
} from "../config.js";
import { resolveNamespace, shouldLogNamespace } from "./namespace.js";
import type {
  CommonLogOptions,
  TraceResolverContext,
  TraceValue,
} from "../types/index.js";

export interface ResolvedDebugContext {
  shouldLog: boolean;
  namespace: string;
  tag: string;
  correlationId?: string;
}

function getClassName(instance: unknown): string {
  return (
    (instance as { constructor?: { name?: string } } | null)?.constructor?.name ??
    "AnonymousClass"
  );
}

function resolveValue(
  value: TraceValue | undefined,
  context: TraceResolverContext,
): string | undefined {
  if (typeof value === "function") {
    try {
      return value(context);
    } catch {
      return undefined;
    }
  }

  return value;
}

export function resolveDebugContext(
  instance: unknown,
  methodName: string,
  options: CommonLogOptions,
  args: unknown[] = [],
): ResolvedDebugContext {
  const className = getClassName(instance);
  const namespace = resolveNamespace(className, methodName, options.namespace);
  const instanceConfig = getInstanceConfig(instance);

  const resolverContext: TraceResolverContext = {
    instance,
    className,
    methodName,
    args,
  };

  const correlationId =
    resolveValue(options.correlationId, resolverContext) ??
    instanceConfig?.correlationId;
  const tag =
    resolveValue(options.tag, resolverContext) ?? instanceConfig?.tag ?? namespace;

  if (!shouldEnableDebug(options.enabled, instanceConfig)) {
    return { shouldLog: false, namespace, tag, correlationId };
  }

  const namespacesMask =
    options.namespaces ??
    instanceConfig?.namespaces ??
    getRuntimeConfig().namespaces;

  return {
    shouldLog: shouldLogNamespace(namespace, namespacesMask),
    namespace,
    tag,
    correlationId,
  };
}

/** Appends the runtime correlation id so concurrent instances stay tellable apart. */
export function formatLabel(namespace: string, correlationId?: string): string {
  return correlationId ? `${namespace} (${correlationId})` : namespace;
}
