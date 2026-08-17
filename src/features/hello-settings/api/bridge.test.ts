import { describe, expect, it, vi } from "vitest";
import { GreetingService } from "../../../entities/greeting/index.js";
import { setLogLevel } from "../../../shared/lib/logger/index.js";
import { registerHelloBridge } from "./bridge.js";

function fakeHarness() {
  const handles = new Map<string, (args?: unknown) => unknown>();
  const dispose = vi.fn(() => undefined);
  const handle = vi.fn((method: string, handler: (args?: unknown) => unknown) => {
    handles.set(method, handler);
    return dispose;
  });
  return { handle, handles, dispose };
}

describe("registerHelloBridge", () => {
  it("registers get and set handlers and returns a disposer chain", () => {
    const harness = fakeHarness();
    const greeting = new GreetingService("hi");

    const dispose = registerHelloBridge(greeting, harness);

    expect(harness.handle).toHaveBeenCalledTimes(2);
    expect(harness.handles.get("hello.getGreeting")).toBeTypeOf("function");
    expect(harness.handles.get("hello.setGreeting")).toBeTypeOf("function");

    dispose();
    expect(harness.dispose).toHaveBeenCalledTimes(2);
  });

  it("getGreeting reads the entity, setGreeting writes it (JSON wire semantics)", () => {
    const harness = fakeHarness();
    const greeting = new GreetingService("hi");
    registerHelloBridge(greeting, harness);

    const get = harness.handles.get("hello.getGreeting");
    const set = harness.handles.get("hello.setGreeting");

    expect(get?.()).toBe("hi");
    expect(set?.("bonjour")).toBe("bonjour");
    expect(greeting.getGreeting()).toBe("bonjour");

    // Non-string payloads degrade to a rejected write instead of corrupting state.
    set?.(42);
    expect(greeting.getGreeting()).toBe("bonjour");
  });

  it("degrades to a no-op with a warning when the harness builtin is absent", () => {
    setLogLevel("debug");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const greeting = new GreetingService("hi");

    const dispose = registerHelloBridge(greeting, undefined);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("harness builtin unavailable") as string,
    );
    expect(dispose()).toBeUndefined();
    warn.mockRestore();
  });
});
