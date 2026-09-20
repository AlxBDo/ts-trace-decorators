interface DebugContextOptions {
    enabled?: boolean;
    namespaces?: string;
    namespace?: string;
}
export interface ResolvedDebugContext {
    shouldLog: boolean;
    namespace: string;
}
export declare function resolveDebugContext(instance: unknown, methodName: string, options: DebugContextOptions): ResolvedDebugContext;
export {};
//# sourceMappingURL=debug-context.d.ts.map