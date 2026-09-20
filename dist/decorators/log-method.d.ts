import { type CommonLogOptions } from "../config.js";
import { type SanitizeOptions } from "../utils/sanitize.js";
export interface LogMethodOptions<This = unknown> extends CommonLogOptions<This>, SanitizeOptions {
    call?: boolean;
    result?: boolean;
    error?: boolean;
}
export declare function LogMethod<This = unknown>(options?: LogMethodOptions<This>): <TThis, TArgs extends unknown[], TReturn>(target: (this: TThis, ...args: TArgs) => TReturn, context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TReturn>) => (this: TThis, ...args: TArgs) => TReturn;
//# sourceMappingURL=log-method.d.ts.map