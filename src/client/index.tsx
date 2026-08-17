import { HelloSettingsSection } from "./features/hello-settings/ui/HelloSettingsSection.tsx";
import type { HelloClientContext } from "./shared/config/context.ts";

/**
 * dsh-plugin-framework client half: mounts a settings section
 * (settings.section) that edits the greeting through the host bridge.
 *
 * The `host` builtin is runner-injected on the client plane (ambient
 * declaration in global.d.ts), exactly as documented for dynamic plugins:
 * Host registers methods with harness.handle, Client calls them with host.call.
 */
export const name = "dsh-plugin-framework";
export const inject = ["slots"] as const;

export function apply(ctx: HelloClientContext): void {
  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "hello-settings",
        order: 100,
        label: () => "Hello Framework",
      },
      () => <HelloSettingsSection host={host} />,
    ),
  );
}
