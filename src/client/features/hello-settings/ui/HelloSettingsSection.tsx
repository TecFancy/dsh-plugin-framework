import { useCallback, useEffect, useState } from "react";
import type { HostBridge } from "../../../shared/config/index.ts";
import { Button } from "../../../shared/ui/button/index.ts";
import css from "./HelloSettingsSection.module.css";

export interface HelloSettingsSectionProps {
  host: HostBridge;
}

/**
 * The settings.section UI of the example plugin: reads the current greeting
 * over the host bridge and writes it back on save. Pure view concerns; all
 * domain rules live in the host entity (blank greetings are rejected there).
 */
export function HelloSettingsSection({ host }: HelloSettingsSectionProps): JSX.Element {
  const [greeting, setGreeting] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    void host.call<string>("hello.getGreeting").then((value) => {
      if (!cancelled) setGreeting(value);
    });
    return () => {
      cancelled = true;
    };
  }, [host]);

  const handleSave = useCallback(() => {
    setSaving(true);
    void host.call<string>("hello.setGreeting", greeting).then((value) => {
      setGreeting(value);
      setSaving(false);
    });
  }, [host, greeting]);

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
