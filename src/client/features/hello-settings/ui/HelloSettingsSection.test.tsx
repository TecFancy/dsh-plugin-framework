// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { HostBridge } from "../../../shared/config/index.ts";
import { HelloSettingsSection } from "./HelloSettingsSection.tsx";

function stubHost(initial: string) {
  const calls: { method: string; args?: unknown }[] = [];
  const host: HostBridge = {
    call: ((method: string, args?: unknown) => {
      calls.push({ method, args });
      if (method === "hello.getGreeting") return Promise.resolve(initial);
      if (method === "hello.setGreeting") return Promise.resolve(String(args));
      return Promise.reject(new Error(`unexpected method ${method}`));
    }) as HostBridge["call"],
  };
  return { host, calls };
}

describe("HelloSettingsSection", () => {
  afterEach(cleanup);

  it("loads the greeting from the host bridge on mount", async () => {
    const { host, calls } = stubHost("hi");
    render(<HelloSettingsSection host={host} />);

    expect(calls[0]).toEqual({ method: "hello.getGreeting", args: undefined });
    const input = await screen.findByTestId<HTMLInputElement>("hello-settings-greeting-input");
    expect(input.value).toBe("hi");
  });

  it("writes the edited greeting back through the bridge on save", async () => {
    const { host, calls } = stubHost("hi");
    render(<HelloSettingsSection host={host} />);

    const input = await screen.findByTestId<HTMLInputElement>("hello-settings-greeting-input");
    fireEvent.change(input, { target: { value: "bonjour" } });

    fireEvent.click(screen.getByTestId("hello-settings-save-btn"));

    expect(calls.some((call) => call.method === "hello.setGreeting")).toBe(true);
    const setCall = calls.find((call) => call.method === "hello.setGreeting");
    expect(setCall?.args).toBe("bonjour");
  });
});
