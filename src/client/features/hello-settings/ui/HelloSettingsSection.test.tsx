// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GreetingRemoteHandle, RemoteResult } from "../../../shared/config/index.ts";
import { HelloSettingsSection } from "./HelloSettingsSection.tsx";

function stubRemote(initial: string) {
  const calls: { method: string; args?: unknown }[] = [];
  const remote: GreetingRemoteHandle = {
    getGreeting: vi.fn((): Promise<RemoteResult<string>> => {
      calls.push({ method: "getGreeting", args: undefined });
      return Promise.resolve({ ok: true, value: initial });
    }),
    setGreeting: vi.fn((value: string): Promise<RemoteResult<string>> => {
      calls.push({ method: "setGreeting", args: value });
      return Promise.resolve({ ok: true, value });
    }),
  };
  return { remote, calls };
}

describe("HelloSettingsSection", () => {
  afterEach(cleanup);

  it("loads the greeting through the remote on mount", async () => {
    const { remote, calls } = stubRemote("hi");
    render(<HelloSettingsSection remote={remote} />);

    expect(calls[0]).toEqual({ method: "getGreeting", args: undefined });
    const input = await screen.findByTestId<HTMLInputElement>("hello-settings-greeting-input");
    expect(input.value).toBe("hi");
  });

  it("writes the edited greeting back through the remote on save", async () => {
    const { remote, calls } = stubRemote("hi");
    render(<HelloSettingsSection remote={remote} />);

    const input = await screen.findByTestId<HTMLInputElement>("hello-settings-greeting-input");
    fireEvent.change(input, { target: { value: "bonjour" } });

    fireEvent.click(screen.getByTestId("hello-settings-save-btn"));

    expect(calls.some((call) => call.method === "setGreeting")).toBe(true);
    const setCall = calls.find((call) => call.method === "setGreeting");
    expect(setCall?.args).toBe("bonjour");
  });

  it("handles a rejected save without crashing", async () => {
    const remote: GreetingRemoteHandle = {
      getGreeting: () => Promise.resolve({ ok: true, value: "hi" }),
      setGreeting: () =>
        Promise.resolve({ ok: false, error: { code: "rejected", message: "blank greeting" } }),
    };
    render(<HelloSettingsSection remote={remote} />);

    const input = await screen.findByTestId<HTMLInputElement>("hello-settings-greeting-input");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByTestId("hello-settings-save-btn"));

    // Let the rejection branch settle; the component keeps the user's text
    // and does not throw.
    await Promise.resolve();
    await Promise.resolve();
    expect(input.value).toBe("   ");
  });
});
