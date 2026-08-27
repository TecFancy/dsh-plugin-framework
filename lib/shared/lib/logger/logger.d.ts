export type LogLevel = "debug" | "info" | "warn" | "error";
/** Raise or lower the log gate. Defaults to "info". */
export declare function setLogLevel(level: LogLevel): void;
/**
 * The framework's generic logging helper for code without a cordis context in
 * scope (slice internals, pure modules). Plugin roots should prefer
 * ctx.logger(name) which is already namespaced by cordis.
 */
export declare const logger: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
};
//# sourceMappingURL=logger.d.ts.map