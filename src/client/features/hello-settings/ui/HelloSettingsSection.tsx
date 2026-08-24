import { useCallback, useEffect, useState } from "react";
import type { GreetingRemoteHandle } from "../../../shared/config/index.ts";
import { Button } from "../../../shared/ui/button/index.ts";
import css from "./HelloSettingsSection.module.css";

export interface HelloSettingsSectionProps {
  remote: GreetingRemoteHandle;
}

/**
 * The settings.section UI of the example plugin: reads the current greeting
 * through the Typert Remote and writes it back on save. Pure view concerns;
 * all domain rules live in the host entity (blank greetings are rejected
 * there, and the Remote result envelope surfaces the outcome).
 */
export function HelloSettingsSection({ remote }: HelloSettingsSectionProps): JSX.Element {
  const [greeting, setGreeting] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    void remote.getGreeting().then((result) => {
      if (cancelled) return;
      if (result.ok) setGreeting(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [remote]);

  const handleSave = useCallback(() => {
    setSaving(true);
    void remote.setGreeting(greeting).then((result) => {
      if (result.ok) setGreeting(result.value);
      setSaving(false);
    });
  }, [remote, greeting]);

  return (
    <div className={css["root"]}>
      <label className={css["label"]} htmlFor="hello-settings-greeting">
        Greeting
      </label>
      <input
        id="hello-settings-greeting"
        className={css["input"]}
        data-testid="hello-settings-greeting-input"
        value={greeting}
        onChange={(event) => setGreeting(event.target.value)}
      />
      <Button data-testid="hello-settings-save-btn" disabled={saving} onClick={handleSave}>
        Save
      </Button>
    </div>
  );
}
