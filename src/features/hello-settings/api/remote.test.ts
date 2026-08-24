import { describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { remoteMethods } from "@deepseek-ai/dsh-typert-protocol";
import { GreetingService } from "../../../entities/greeting/index.js";
import { GreetingRemote } from "./remote.js";

/**
 * Minimal structural fake of the cordis Service registration face; the real
 * context is provided by the dsh host runner. Service instances only call
 * ctx.reflect.provide at construction, which is all this needs.
 */
function fakeContext(): Context {
  return {
    reflect: { provide: () => undefined },
  } as unknown as Context;
}

describe("GreetingRemote", () => {
  it("registers under the greeting service key with a matching gateway binding", () => {
    const remote = new GreetingRemote(fakeContext(), new GreetingService("hi"));

    expect(remote.typertRemote).toMatchObject({
      service: remote,
      serviceKey: "greeting",
      namespace: "greeting",
    });
  });

  it("records SRC-mode markers for both endpoints in declaration order", () => {
    const remote = new GreetingRemote(fakeContext(), new GreetingService("hi"));

    expect(remoteMethods(remote)).toEqual([
      { method: "getGreeting", invocation: { kind: "direct" } },
      { method: "setGreeting", invocation: { kind: "direct" } },
    ]);
  });

  it("reads and writes through the greeting entity with its rules", () => {
    const greeting = new GreetingService("hi");
    const remote = new GreetingRemote(fakeContext(), greeting);

    expect(remote.getGreeting()).toBe("hi");
    expect(remote.setGreeting("bonjour")).toBe("bonjour");
    // The entity rejects blank strings, so the previous value stays.
    expect(remote.setGreeting("   ")).toBe("bonjour");
    expect(greeting.getGreeting()).toBe("bonjour");
  });
});
