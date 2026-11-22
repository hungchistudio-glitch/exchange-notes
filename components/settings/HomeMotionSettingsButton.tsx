"use client";

import { Smartphone } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import { HOME_MOTION_EVENT, homeMotionOn, setHomeMotion } from "@/lib/home/deviceMotion";

function subscribe(onChange: () => void) {
  window.addEventListener(HOME_MOTION_EVENT, onChange);
  return () => window.removeEventListener(HOME_MOTION_EVENT, onChange);
}

/**
 * Whether the home answers the phone's tilt and shake, for this device
 * (Chi, 2026-11-22: 設定開關). On by default; off, nothing listens to the
 * phone's motion at all and the capsules only float.
 */
export default function HomeMotionSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.homeMotion;
  // The choice lives in this device's storage, so the server has none.
  const on = useSyncExternalStore<boolean | null>(subscribe, homeMotionOn, () => null);
  const toggle = useCallback(() => setHomeMotion(!homeMotionOn()), []);

  return (
    <SettingsRow
      title={copy.rowTitle}
      description={copy.rowDescription}
      icon={<Smartphone size={16} strokeWidth={1.8} />}
      tone={on ? "blue" : "neutral"}
      value={on === null ? "" : on ? copy.on : copy.off}
      onClick={toggle}
    />
  );
}
