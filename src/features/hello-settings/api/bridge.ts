import type { GreetingService } from "../../../entities/greeting/index.js";
import { logger } from "../../../shared/lib/logger/index.js";

/**
 * The host half of the package-private client-to-host bridge.
 *
 * The client bundle calls these methods through `host.call(...)`; the handler
 * results are JSON-cloned across the wire, so only JSON-safe values may be
 * returned.
 *
 * `harness` is a runner-injected builtin on the dsh host plane (like `React`
 * on the client plane), so it is only visible at runtime, not to tsc. The
 * ambient declaration lives in src/global.d.ts; this function takes the builtin
 * as a parameter with a global fallback so unit tests can inject a stub and
 * the absence of the builtin degrades to a warning instead of a crash.
 */
interface HarnessLike {
  handle(method: string, handler: (args?: unknown) => unknown): () => void;
}

function getHarness(): HarnessLike | undefined {
  if (typeof harness === "undefined") return undefined;
  return harness;
}

export function registerHelloBridge(
  greeting: GreetingService,
  harnessLike: HarnessLike | undefined = getHarness(),
): () => void {
  if (harnessLike === undefined) {
    logger.warn(
      "harness builtin unavailable: hello bridge disabled (client host.call will reject)",
    );
    return () => undefined;
  }

  const disposers = [
    harnessLike.handle("hello.getGreeting", () => greeting.getGreeting()),
    harnessLike.handle("hello.setGreeting", (raw) => {
      greeting.setGreeting(typeof raw === "string" ? raw : "");
      return greeting.getGreeting();
    }),
  ];

  return () => {
    for (const dispose of disposers) dispose();
  };
}
