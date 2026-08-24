// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { apply } from "./index.tsx";
import type { HelloClientContext, RemoteContribution } from "./shared/config/index.ts";

/**
 * Smoke tests for the client assembly root: apply() must mount the generated
 * /remote contribution, defer the settings section registration until the slot
 * exists (slots.inject), and register it with the expected identity wired to
 * the mounted greeting namespace.
 */
function fakeContext() {
  const registrations: { options: unknown; view: () => unknown }[] = [];
  const mounted: RemoteContribution[] = [];
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
    remote: {
      $mount: (contribution) => {
        mounted.push(contribution);
        return Promise.resolve(() => Promise.resolve());
      },
      greeting: {
        getGreeting: () => Promise.resolve({ ok: true, value: "hi" }),
        setGreeting: () => Promise.resolve({ ok: true, value: "bonjour" }),
      },
    },
  };
  return { ctx, registrations, mounted };
}

describe("apply (client root)", () => {
  afterEach(cleanup);

  it("mounts the /remote contribution and registers the hello-settings section", async () => {
    const { ctx, registrations, mounted } = fakeContext();

    await apply(ctx);

    expect(mounted).toHaveLength(1);
    expect(mounted[0]?.package).toBe("dsh-plugin-framework");
    expect(registrations).toHaveLength(1);
    const registration = registrations[0]!;
    expect(registration.options).toMatchObject({
      name: "settings.section",
      id: "hello-settings",
    });
    expect(registration.view).toBeTypeOf("function");
  });

  it("wires the mounted greeting namespace into the registered view", async () => {
    const { ctx, registrations } = fakeContext();
    await apply(ctx);

    const registration = registrations[0]!;
    render(registration.view() as React.ReactElement);

    const input = await screen.findByTestId<HTMLInputElement>("hello-settings-greeting-input");
    expect(input.value).toBe("hi");
  });
});
