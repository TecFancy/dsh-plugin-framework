import type { Context } from "@deepseek-ai/cordis";
import { registerHelloBridge } from "./features/hello-settings/api/bridge.js";
import { registerHelloTool } from "./features/hello-settings/api/register-tool.js";
import { GreetingService } from "./entities/greeting/index.js";
import { Config, type PluginConfig } from "./shared/config/plugin-config.js";

/**
 * dsh-plugin-framework is the reference plugin shipped with the framework
 * scaffold: it demonstrates every layer of the architecture in one small slice
 *
 * - entities/greeting   domain object plus its storage-free state
 * - features/hello-settings/api   a model Tool registration and the host half
 *   of the client-to-host bridge (harness.handle)
 * - client/...          the settings.section UI that talks to the bridge over
 *   host.call JSON RPC
 *
 * The apply() root wires services into cordis lifecycle effects so every
 * contribution is removed when the plugin stops or updates.
 */
export const name = "dsh-plugin-framework";

/** Hard dependency: the dsh tool runtime is required to register the example tools. */
export const inject = ["tools"] as const;

export { Config };
export type { PluginConfig };

export function apply(ctx: Context, config: PluginConfig): void {
  const greeting = new GreetingService(config.defaultGreeting);
  const log = ctx.logger("dsh-plugin-framework");

  ctx.effect(() => registerHelloTool(ctx.tools, greeting), "dsh-plugin-framework: register tool");
  ctx.effect(() => registerHelloBridge(greeting), "dsh-plugin-framework: host bridge");

  log.info("dsh-plugin-framework activated (defaultGreeting=%s)", config.defaultGreeting);
}
