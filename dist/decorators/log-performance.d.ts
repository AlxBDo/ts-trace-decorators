import { type CommonLogOptions } from "../config.js";
export interface LogPerformanceOptions<This = unknown> extends CommonLogOptions<This> {
    slowThresholdMs?: number;
}
export declare function LogPerformance<This = unknown>(options?: LogPerformanceOptions<This>): <TThis, TArgs extends unknown[], TReturn>(target: (this: TThis, ...args: TArgs) => TReturn, context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TReturn>) => (this: TThis, ...args: TArgs) => TReturn;
//# sourceMappingURL=log-performance.d.ts.map