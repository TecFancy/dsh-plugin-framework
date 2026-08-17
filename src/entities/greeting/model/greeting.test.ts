import { describe, expect, it } from "vitest";
import { GreetingService } from "./greeting.js";

describe("GreetingService", () => {
  it("returns the initial greeting", () => {
    const service = new GreetingService("hello");
    expect(service.getGreeting()).toBe("hello");
  });

  it("updates the greeting on set", () => {
    const service = new GreetingService("hello");
    service.setGreeting("goodbye");
    expect(service.getGreeting()).toBe("goodbye");
  });

  it("rejects blank greetings (domain rule: empty string is not a greeting)", () => {
    const service = new GreetingService("hello");
    service.setGreeting("   ");
    expect(service.getGreeting()).toBe("hello");
  });
});
