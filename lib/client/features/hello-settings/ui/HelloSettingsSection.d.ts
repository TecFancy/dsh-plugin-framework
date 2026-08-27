import type { GreetingRemoteHandle } from "../../../shared/config/index.ts";
export interface HelloSettingsSectionProps {
    remote: GreetingRemoteHandle;
}
/**
 * The settings.section UI of the example plugin: reads the current greeting
 * through the Typert Remote and writes it back on save. Pure view concerns;
 * all domain rules live in the host entity (blank greetings are rejected
 * there, and the Remote result envelope surfaces the outcome).
 */
export declare function HelloSettingsSection({ remote }: HelloSettingsSectionProps): JSX.Element;
//# sourceMappingURL=HelloSettingsSection.d.ts.map