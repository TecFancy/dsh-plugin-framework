// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { apply } from "./index.tsx";
import type { HelloClientContext } from "./shared/config/context.ts";

/**
 * Smoke test for the client assembly root: apply() must defer the settings
 * section registration until the slot exists (slots.inject) and register it
 * with the expected identity. The registered view is intentionally NOT
 * invoked here (it needs the runner-injected `host` builtin); the UI itself
 * is covered by the feature slice test.
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

describe("apply (client root)", () => {
  afterEach(cleanup);

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
});
