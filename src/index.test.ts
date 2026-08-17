import { describe, expect, it, vi } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { apply } from "./index.js";

/**
 * Smoke test for the host assembly root: apply() must wire the tool
 * registration and the host bridge as disposable cordis effects, with no
 * global side effects. Uses a minimal structural fake of the cordis context;
 * the real context is provided by the dsh host runner.
 */
function fakeContext() {
  const disposer = vi.fn(() => undefined);
  const register = vi.fn((_definition: unknown) => disposer);
  const effects: (() => unknown)[] = [];
  const ctx = {
    tools: { register },
    logger: (_name: string) => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    effect: (callback: () => unknown) => {
      effects.push(callback);
      return disposer;
    },
    get: () => undefined,
  };
  return { ctx, register, effects, disposer };
}

describe("apply (host root)", () => {
  it("registers the tool and the bridge as disposable effects", () => {
    const { ctx, register, effects, disposer } = fakeContext();

    apply(ctx as unknown as Context, { defaultGreeting: "hello framework" });

    // Two effects: tool registration + host bridge.
    expect(effects).toHaveLength(2);

    // Running the effects performs the registrations and returns disposers.
    const disposers: (() => void)[] = [];
    for (const effect of effects) {
      const result = effect();
      expect(typeof result).toBe("function");
      if (typeof result === "function") disposers.push(result as () => void);
    }

    expect(register).toHaveBeenCalledTimes(1);
    const definition = register.mock.calls[0]?.[0];
    expect(definition).toMatchObject({ name: "hello_world_greet" });

    for (const dispose of disposers) dispose();
    expect(disposer).toHaveBeenCalled();
  });
});
