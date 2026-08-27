/**
 * Client feature slice: hello settings UI.
 *
 * Mirrors the host feature of the same name: the settings.section view that
 * edits the greeting through the host bridge. Client slices follow the same
 * layering rules as host slices; the only difference is that there is no
 * entities layer here unless the plugin gains genuinely persistent client-side
 * domain state (rare for slot-mounted UI).
 */
export { HelloSettingsSection } from "./ui/HelloSettingsSection.js";
export type { HelloSettingsSectionProps } from "./ui/HelloSettingsSection.js";
//# sourceMappingURL=index.d.ts.map