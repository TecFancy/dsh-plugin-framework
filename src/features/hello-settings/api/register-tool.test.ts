import { describe, expect, it, vi } from "vitest";
import type { ToolDefinition } from "@deepseek-ai/dsh-tools";
import { GreetingService } from "../../../entities/greeting/index.js";
import { registerHelloTool } from "./register-tool.js";

function fakeTools() {
  const disposer = vi.fn(() => undefined);
  const register = vi.fn((_definition: ToolDefinition) => disposer);
  return {
    register,
    disposer,
    definition: (): ToolDefinition | undefined => register.mock.calls[0]?.[0],
  };
}

describe("registerHelloTool", () => {
  it("registers the hello_world_greet tool on the tool runtime", () => {
    const tools = fakeTools();
    const greeting = new GreetingService("hi");

    const returned = registerHelloTool(tools, greeting);

    expect(tools.register).toHaveBeenCalledTimes(1);
    expect(tools.definition()).toMatchObject({
      name: "hello_world_greet",
      description: expect.stringContaining("greeting") as string,
    });
    expect(returned).toBe(tools.disposer);
  });

  it("returns the current greeting from the entity when executed", async () => {
    const tools = fakeTools();
    const greeting = new GreetingService("hi");
    registerHelloTool(tools, greeting);

    const definition = tools.definition();
    const result = await definition?.execute({}, {} as never);
    expect(result).toEqual({ text: "hi" });
  });
});
