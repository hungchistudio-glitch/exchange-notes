"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import SettingsRow from "@/components/foundation/rows/SettingsRow";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  INTERFACE_SOUNDS_EVENT,
  interfaceSounds,
  interfaceSoundsOn,
  setInterfaceSounds,
  unlockInterfaceSounds,
} from "@/lib/sound/interfaceSounds";

function subscribe(onChange: () => void) {
  window.addEventListener(INTERFACE_SOUNDS_EVENT, onChange);
  return () => window.removeEventListener(INTERFACE_SOUNDS_EVENT, onChange);
}

/**
 * The interface's sounds, on or off for this device (Chi, 2026-11-14: on
 * by default in Yumi Cosmic, off in Standard). One tap switches; switching
 * on plays the reward's two notes, so the reader hears what they chose.
 */
export default function InterfaceSoundsSettingsButton() {
  const { t } = useTranslation();
  const copy = t.settings.interfaceSounds;
  const { interfaceMode } = useInterfaceMode();
  // The choice lives in this device's storage, so the server has none.
  const on = useSyncExternalStore<boolean | null>(
    subscribe,
    () => interfaceSoundsOn(interfaceMode),
    () => null,
  );

  const toggle = useCallback(() => {
    const next = !interfaceSoundsOn(interfaceMode);
    setInterfaceSounds(next);
    if (next) {
      unlockInterfaceSounds();
      window.setTimeout(() => interfaceSounds.reward(), 60);
    }
  }, [interfaceMode]);

  return (
    <SettingsRow
      title={copy.rowTitle}
      description={copy.rowDescription}
      icon={on === false ? <VolumeX size={16} strokeWidth={1.8} /> : <Volume2 size={16} strokeWidth={1.8} />}
      tone={on ? "blue" : "neutral"}
      value={on === null ? "" : on ? copy.on : copy.off}
      onClick={toggle}
    />
  );
}
