import { type LogMethodOptions } from "./log-method.js";
export interface LogClassOptions extends LogMethodOptions {
    includeMethods?: Array<string | RegExp>;
    excludeMethods?: Array<string | RegExp>;
}
export declare function LogClass(options?: LogClassOptions): <TClass extends abstract new (...args: never[]) => object>(target: TClass, _context: ClassDecoratorContext<TClass>) => TClass;
//# sourceMappingURL=log-class.d.ts.map