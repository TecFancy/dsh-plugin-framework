const ORDER = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
const PREFIX = "[dsh-plugin-framework]";
let threshold = "info";
/** Raise or lower the log gate. Defaults to "info". */
export function setLogLevel(level) {
    threshold = level;
}
function enabled(level) {
    return ORDER[level] >= ORDER[threshold];
}
function write(level, message, ...args) {
    if (!enabled(level))
        return;
    const line = `${PREFIX} ${level}: ${message}`;
    if (level === "debug") {
        console.log(line, ...args);
        return;
    }
    console[level](line, ...args);
}
/**
 * The framework's generic logging helper for code without a cordis context in
 * scope (slice internals, pure modules). Plugin roots should prefer
 * ctx.logger(name) which is already namespaced by cordis.
 */
export const logger = {
    debug: (message, ...args) => write("debug", message, ...args),
    info: (message, ...args) => write("info", message, ...args),
    warn: (message, ...args) => write("warn", message, ...args),
    error: (message, ...args) => write("error", message, ...args),
};
//# sourceMappingURL=logger.js.map