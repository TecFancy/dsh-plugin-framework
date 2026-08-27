import type { HelloClientContext } from "./shared/config/index.ts";
/**
 * dsh-plugin-framework client half: mounts a settings section
 * (settings.section) that edits the greeting through the plugin's Typert
 * Remote contribution.
 *
 * The host registers the GreetingRemote service (ctx.greeting) and the Typert
 * gateway dispatches `greeting/*` over /api; this half mounts the generated
 * /remote contribution so `ctx.remote.greeting` becomes callable, then
 * registers the settings section UI.
 */
export declare const name = "dsh-plugin-framework";
export declare const inject: readonly ["slots", "remote"];
export declare function apply(ctx: HelloClientContext): Promise<void>;
//# sourceMappingURL=index.d.ts.map