import { type LogMethodOptions } from "./log-method.js";
export interface LogClassOptions<This = unknown> extends LogMethodOptions<This> {
    includeMethods?: Array<string | RegExp>;
    excludeMethods?: Array<string | RegExp>;
}
export declare function LogClass<This = unknown>(options?: LogClassOptions<This>): <TClass extends abstract new (...args: never[]) => object>(target: TClass, _context: ClassDecoratorContext<TClass>) => TClass;
//# sourceMappingURL=log-class.d.ts.map