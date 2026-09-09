"use client";

import { BellRing } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SettingsToggleRow } from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getDeviceTimeZone } from "@/lib/push/deviceTimeZone";

type PreferencesResponse = {
  ok?: boolean;
  enabled?: boolean;
  timeZone?: string;
  error?: string;
};

type YumiReminderSettingsButtonProps = {
  id?: string;
  // Failures are reported where the page already reports them, rather than
  // by a second error surface inside one row.
  onError: (message: string) => void;
};

/**
 * A switch, because it is a boolean.
 *
 * The old row said "On" and opened a sheet to say it again with a button. The
 * only things in that sheet worth keeping — the device timezone and the test
 * notification — moved to the Notifications sheet, where everything else
 * about push delivery already lives.
 */
export default function YumiReminderSettingsButton({
  id,
  onError,
}: YumiReminderSettingsButtonProps) {
  const { t } = useTranslation();
  const copy = t.settings.yumiReminders;

  const detectedTimeZone = useMemo(() => getDeviceTimeZone(), []);

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/push/yumi-preferences", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        const body = (await response
          .json()
          .catch(() => ({}))) as PreferencesResponse;

        if (!response.ok) throw new Error(body.error ?? copy.loadError);
        if (cancelled) return;

        setEnabled(body.enabled === true);
      } catch {
        if (!cancelled) onError(copy.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
    // onError is recreated on every render of the page; depending on it would
    // re-run this fetch on every keystroke elsewhere on the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.loadError]);

  /*
   * Optimistic: the switch moves on touch and the request follows. A failure
   * puts it back and says so — which is the only honest way to show a control
   * whose real state lives on a server two hundred milliseconds away.
   */
  async function updateEnabled(nextEnabled: boolean) {
    if (saving || loading) return;

    const previous = enabled;

    setEnabled(nextEnabled);
    setSaving(true);

    try {
      const response = await fetch("/api/push/yumi-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          enabled: nextEnabled,
          timeZone: detectedTimeZone,
        }),
      });

      const body = (await response
        .json()
        .catch(() => ({}))) as PreferencesResponse;

      if (!response.ok) throw new Error(body.error ?? copy.saveError);
    } catch {
      setEnabled(previous);
      onError(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsToggleRow
      id={id}
      title={copy.rowTitle}
      description={copy.rowDescription}
      icon={<BellRing size={16} strokeWidth={1.8} />}
      tone={enabled ? "blue" : "neutral"}
      checked={enabled}
      busy={saving}
      disabled={loading}
      onChange={(next) => void updateEnabled(next)}
    />
  );
}
