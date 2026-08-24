import greetingRemote from "dsh-plugin-framework/remote";
import { HelloSettingsSection } from "./features/hello-settings/ui/HelloSettingsSection.tsx";
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
export const name = "dsh-plugin-framework";
export const inject = ["slots", "remote"] as const;

export async function apply(ctx: HelloClientContext): Promise<void> {
  // $mount owns its registration in this fiber and withdraws it on unload, so
  // no extra disposer is retained here (same pattern as dsh-api-remotes).
  await ctx.remote.$mount(greetingRemote);

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "hello-settings",
        order: 100,
        label: () => "Hello Framework",
      },
      () => <HelloSettingsSection remote={ctx.remote.greeting} />,
    ),
  );
}
