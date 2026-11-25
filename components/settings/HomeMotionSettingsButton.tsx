"use client";

import { Smartphone } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";

import { SettingsToggleRow } from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import { HOME_MOTION_EVENT, enableDeviceMotion, homeMotionOn, setHomeMotion } from "@/lib/home/deviceMotion";

function subscribe(onChange: () => void) {
  window.addEventListener(HOME_MOTION_EVENT, onChange);
  return () => window.removeEventListener(HOME_MOTION_EVENT, onChange);
}

/**
 * Whether the home answers the phone's tilt and shake, for this device
 * (Chi, 2026-11-23: only ask here). Off until explicitly enabled; the
 * browser's own permission dialog may appear only from this switch.
 */
export default function HomeMotionSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.homeMotion;
  // The choice lives in this device's storage, so the server has none.
  const on = useSyncExternalStore<boolean | null>(subscribe, homeMotionOn, () => null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState<"denied" | "unavailable" | null>(null);
  const toggle = async () => {
    if (pending.current) return;
    setNotice(null);
    if (homeMotionOn()) { setHomeMotion(false); return; }
    pending.current = true;
    setBusy(true);
    const result = await enableDeviceMotion();
    setNotice(result === "enabled" ? null : result);
    pending.current = false;
    setBusy(false);
  };

  return (
    <div>
      <SettingsToggleRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        icon={<Smartphone size={16} strokeWidth={1.8} />}
        tone={on ? "blue" : "neutral"}
        checked={on === true}
        disabled={busy || on === null}
        busy={busy}
        onChange={() => { void toggle(); }}
      />
      {notice && (
        <p role="status" className="px-4 pb-3 text-sm text-ink-soft">
          {notice === "denied" ? copy.permissionDenied : copy.unavailable}
        </p>
      )}
    </div>
  );
}
