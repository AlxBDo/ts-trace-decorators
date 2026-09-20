import { type CommonLogOptions } from "../config.js";
import { type SanitizeOptions } from "../utils/sanitize.js";
export interface LogMethodOptions extends CommonLogOptions, SanitizeOptions {
    call?: boolean;
    result?: boolean;
    error?: boolean;
}
export declare function wrapLogMethod<TThis, TArgs extends unknown[], TReturn>(target: (this: TThis, ...args: TArgs) => TReturn, methodName: string, options: LogMethodOptions): (this: TThis, ...args: TArgs) => TReturn;
export declare function LogMethod(options?: LogMethodOptions): <TThis, TArgs extends unknown[], TReturn>(target: (this: TThis, ...args: TArgs) => TReturn, context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TReturn>) => (this: TThis, ...args: TArgs) => TReturn;
//# sourceMappingURL=log-method.d.ts.map