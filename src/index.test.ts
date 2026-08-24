import { describe, expect, it, vi } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { apply } from "./index.js";

/**
 * Smoke test for the host assembly root: apply() must wire the tool
 * registration as a disposable cordis effect and register the GreetingRemote
 * service in the current fiber, with no global side effects. Uses a minimal
 * structural fake of the cordis context; the real context is provided by the
 * dsh host runner.
 */
function fakeContext() {
  const disposer = vi.fn(() => undefined);
  const register = vi.fn((_definition: unknown) => disposer);
  const effects: (() => unknown)[] = [];
  const provided: string[] = [];
  const ctx = {
    tools: { register },
    logger: (_name: string) => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    effect: (callback: () => unknown) => {
      effects.push(callback);
      return disposer;
    },
    reflect: {
      provide: (name: string) => {
        provided.push(name);
      },
    },
    get: () => undefined,
  };
  return { ctx, register, effects, disposer, provided };
}

describe("apply (host root)", () => {
  it("registers the tool as a disposable effect and the greeting remote", () => {
    const { ctx, register, effects, disposer, provided } = fakeContext();

    apply(ctx as unknown as Context, { defaultGreeting: "hello framework" });

    // One effect (tool registration); GreetingRemote registers at construction.
    expect(effects).toHaveLength(1);
    expect(provided).toEqual(["greeting"]);

    const result = effects[0]?.();
    expect(typeof result).toBe("function");
    if (typeof result === "function") (result as () => void)();

    expect(register).toHaveBeenCalledTimes(1);
    const definition = register.mock.calls[0]?.[0];
    expect(definition).toMatchObject({ name: "hello_world_greet" });
    expect(disposer).toHaveBeenCalled();
  });
});
