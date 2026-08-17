export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const PREFIX = "[dsh-plugin-framework]";

let threshold: LogLevel = "info";

/** Raise or lower the log gate. Defaults to "info". */
export function setLogLevel(level: LogLevel): void {
  threshold = level;
}

function enabled(level: LogLevel): boolean {
  return ORDER[level] >= ORDER[threshold];
}

function write(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!enabled(level)) return;
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
  debug: (message: string, ...args: unknown[]): void => write("debug", message, ...args),
  info: (message: string, ...args: unknown[]): void => write("info", message, ...args),
  warn: (message: string, ...args: unknown[]): void => write("warn", message, ...args),
  error: (message: string, ...args: unknown[]): void => write("error", message, ...args),
};
