import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, setLogLevel, type LogLevel } from "./logger.js";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setLogLevel("info");
  });

  it.each<[LogLevel, "error" | "warn" | "info"]>([
    ["error", "error"],
    ["warn", "warn"],
    ["info", "info"],
  ])("writes %s messages when the threshold allows them", (level, consoleMethod) => {
    setLogLevel("info");
    const spy = vi.spyOn(console, consoleMethod).mockImplementation(() => undefined);
    logger[level]("boom");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(`[dsh-plugin-framework] ${level}: boom`) as string,
    );
  });

  it("writes debug only when the threshold is lowered to debug", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.debug("hidden");
    expect(spy).not.toHaveBeenCalled();

    setLogLevel("debug");
    logger.debug("visible");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("[dsh-plugin-framework] debug: visible") as string,
    );
  });

  it("filters messages below the threshold", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    setLogLevel("error");
    logger.warn("muted");
    expect(spy).not.toHaveBeenCalled();
  });
});
