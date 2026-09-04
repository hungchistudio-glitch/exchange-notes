"use client";

import { Volume2 } from "lucide-react";

import { SettingsToggleRow } from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLaunchSoundEnabled from "@/hooks/preferences/useLaunchSound";
import { setLaunchSoundEnabled } from "@/lib/appPreferences";

/**
 * Whether the opening animation is allowed to make a sound.
 *
 * The only switch in the app that turns a sound off, which is why it exists:
 * the opening runs on every load, and something that plays without being asked
 * needs somewhere to be told not to.
 *
 * Read through the hook rather than copied in on mount, so it follows a change
 * made on another device — the preference travels with the account.
 */
export default function LaunchSoundSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.launchSound;
  const enabled = useLaunchSoundEnabled();

  return (
    <SettingsToggleRow
      title={copy.rowTitle}
      description={copy.rowDescription}
      icon={<Volume2 size={16} strokeWidth={1.8} />}
      checked={enabled}
      onChange={setLaunchSoundEnabled}
    />
  );
}
