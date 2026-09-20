export interface SanitizeOptions {
    mask?: string;
    sensitiveKeys?: string[];
}
export declare function sanitize<T>(input: T, options?: SanitizeOptions, seen?: WeakSet<object>): T;
//# sourceMappingURL=sanitize.d.ts.map