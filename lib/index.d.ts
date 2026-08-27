import type { Context } from "@deepseek-ai/cordis";
import { Config, type PluginConfig } from "./shared/config/plugin-config.js";
/**
 * dsh-plugin-framework is the reference plugin shipped with the framework
 * scaffold: it demonstrates every layer of the architecture in one small slice
 *
 * - entities/greeting   domain object plus its storage-free state
 * - features/hello-settings/api   a model Tool registration and the host half
 *   of the client-to-host bridge (GreetingRemote, dispatched by the Typert
 *   gateway over /api; the client calls it through ctx.remote.$mount)
 * - client/...          the settings.section UI that reads and writes the
 *   greeting over the same Remote
 *
 * The apply() root wires services into cordis lifecycle effects so every
 * contribution is removed when the plugin stops or updates.
 */
export declare const name = "dsh-plugin-framework";
/** Hard dependency: the dsh tool runtime is required to register the example tools. */
export declare const inject: readonly ["tools"];
export { Config };
export type { PluginConfig };
export declare function apply(ctx: Context, config: PluginConfig): void;
//# sourceMappingURL=index.d.ts.map