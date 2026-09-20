export type LogLevel = "log" | "table" | "warn" | "error";
export interface LoggerLike {
    log: (...args: unknown[]) => void;
    table: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    group: (...args: unknown[]) => void;
    groupCollapsed: (...args: unknown[]) => void;
    groupEnd: () => void;
}
export interface RuntimeDebugConfig {
    enabled?: boolean;
    namespaces?: string;
}
export interface LogContext<This = unknown> {
    instance: This;
    args: unknown[];
    result?: unknown;
    error?: unknown;
    durationMs?: number;
    namespace: string;
    methodName: string;
}
export type CustomLogHandler<This = unknown> = (payload: LogContext<This>) => unknown;
export interface TraceEvent {
    status: "CALL" | "RESULT" | "ERROR" | "PERFORMANCE";
    payload: unknown;
    timestamp: string;
}
export interface CommonLogOptions<This = unknown> {
    enabled?: boolean;
    namespaces?: string;
    namespace?: string;
    logger?: Partial<LoggerLike>;
    logLevel?: LogLevel;
    traceMode?: "inline" | "grouped" | "both";
    tag?: string;
    customLog?: CustomLogHandler<This>;
}
export declare function getLogger(overrides?: Partial<LoggerLike>): LoggerLike;
export declare function getRuntimeConfig(): RuntimeDebugConfig;
export declare function shouldEnableDebug(optionEnabled?: boolean): boolean;
//# sourceMappingURL=config.d.ts.map