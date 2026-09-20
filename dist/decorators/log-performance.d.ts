import { type CommonLogOptions } from "../config.js";
export interface LogPerformanceOptions extends CommonLogOptions {
    slowThresholdMs?: number;
}
export declare function LogPerformance(options?: LogPerformanceOptions): <TThis, TArgs extends unknown[], TReturn>(target: (this: TThis, ...args: TArgs) => TReturn, context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TReturn>) => (this: TThis, ...args: TArgs) => TReturn;
//# sourceMappingURL=log-performance.d.ts.map