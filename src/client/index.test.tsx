// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apply } from "./index.tsx";
import type { HelloClientContext, HostBridge } from "./shared/config/index.ts";

/**
 * Smoke tests for the client assembly root: apply() must defer the settings
 * section registration until the slot exists (slots.inject), register it with
 * the expected identity, and wire the runner-injected `host` builtin into the
 * view. The wiring is verified by stubbing the global `host` and rendering the
 * registered view exactly as the web app would.
 */
function fakeContext() {
  const registrations: { options: unknown; view: () => unknown }[] = [];
  const ctx: HelloClientContext = {
    slots: {
      inject: (slotName: string, register: () => void) => {
        expect(slotName).toBe("settings.section");
        register();
      },
      register: (options, view) => {
        registrations.push({ options, view });
        return undefined;
      },
    },
  };
  return { ctx, registrations };
}

function stubHost(initial: string) {
  const host: HostBridge = {
    call: ((method: string, args?: unknown) => {
      if (method === "hello.getGreeting") return Promise.resolve(initial);
      if (method === "hello.setGreeting") return Promise.resolve(String(args));
      return Promise.reject(new Error(`unexpected method ${method}`));
    }) as HostBridge["call"],
  };
  vi.stubGlobal("host", host);
  return host;
}

describe("apply (client root)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("registers the hello-settings section into the settings.section slot", () => {
    const { ctx, registrations } = fakeContext();

    apply(ctx);

    expect(registrations).toHaveLength(1);
    const registration = registrations[0]!;
    expect(registration.options).toMatchObject({
      name: "settings.section",
      id: "hello-settings",
    });
    expect(registration.view).toBeTypeOf("function");
  });

  it("wires the global host builtin into the registered view", async () => {
    const { ctx, registrations } = fakeContext();
    stubHost("wired");
    apply(ctx);

    const registration = registrations[0]!;
    render(registration.view() as React.ReactElement);

    const input = await screen.findByTestId<HTMLInputElement>("hello-settings-greeting-input");
    expect(input.value).toBe("wired");
  });
});
