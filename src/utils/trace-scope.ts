import type { TraceEvent } from "../types/index.js";

export interface TraceScope {
  events: TraceEvent[];
  depth: number;
  truncated: boolean;
}

/**
 * Hard cap so a correlated scope that never settles (pending promise, detached
 * flow) cannot grow without bound.
 */
export const MAX_SCOPE_EVENTS = 250;

const activeScopes = new Map<string, TraceScope>();

/**
 * Opens — or joins — the scope identified by `correlationId`. Nested calls
 * sharing an id aggregate into a single trace instead of emitting one
 * disconnected group per method.
 *
 * Without a correlation id each call gets its own private scope, preserving the
 * previous per-call behaviour.
 */
export function enterScope(correlationId?: string): TraceScope {
  if (!correlationId) {
    return { events: [], depth: 1, truncated: false };
  }

  const existing = activeScopes.get(correlationId);
  if (existing) {
    existing.depth += 1;
    return existing;
  }

  const created: TraceScope = { events: [], depth: 1, truncated: false };
  activeScopes.set(correlationId, created);
  return created;
}

export function pushEvent(scope: TraceScope, event: TraceEvent): void {
  if (scope.events.length >= MAX_SCOPE_EVENTS) {
    scope.truncated = true;
    return;
  }

  scope.events.push(event);
}

/**
 * Closes one nesting level. Returns the aggregated events only when the
 * outermost level completes, so the caller emits exactly one grouped trace per
 * correlated flow.
 */
export function exitScope(
  scope: TraceScope,
  correlationId?: string,
): TraceEvent[] | undefined {
  scope.depth -= 1;

  if (scope.depth > 0) {
    return undefined;
  }

  if (correlationId) {
    activeScopes.delete(correlationId);
  }

  return scope.events;
}

/** Test/diagnostic helper — drops every pending correlated scope. */
export function clearScopes(): void {
  activeScopes.clear();
}
