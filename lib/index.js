import { GreetingRemote, registerHelloTool } from "./features/hello-settings/index.js";
import { GreetingService } from "./entities/greeting/index.js";
import { Config } from "./shared/config/index.js";
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
export const name = "dsh-plugin-framework";
/** Hard dependency: the dsh tool runtime is required to register the example tools. */
export const inject = ["tools"];
export { Config };
export function apply(ctx, config) {
    const greeting = new GreetingService(config.defaultGreeting);
    const log = ctx.logger("dsh-plugin-framework");
    ctx.effect(() => registerHelloTool(ctx.tools, greeting), "dsh-plugin-framework: register tool");
    // The TypertRemoteService registers ctx.greeting in this fiber (withdrawn
    // automatically on unload); the gateway dispatches the greeting/* endpoints.
    new GreetingRemote(ctx, greeting);
    log.info("dsh-plugin-framework activated (defaultGreeting=%s)", config.defaultGreeting);
}
//# sourceMappingURL=index.js.map