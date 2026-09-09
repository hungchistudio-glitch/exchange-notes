"use client";

import { Orbit } from "lucide-react";

import SegmentedControl from "@/components/foundation/forms/SegmentedControl";
import { SettingsControlRow } from "@/components/foundation/rows/SettingsRow";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { InterfaceMode } from "@/lib/appPreferences";

/**
 * The one setting that changes the whole app, decided in place.
 *
 * It used to open a sheet to show two cards that said what the row already
 * said. Switching is the point, and switching is now one tap — the crossfade
 * between the two themes is handled by ModeTransitionStage, so the route and
 * the scroll position both survive it.
 */
export default function InterfaceModeSettingsButton({ id }: { id?: string }) {
  const { t } = useTranslation();
  const { interfaceMode, setInterfaceMode } = useInterfaceMode();
  const copy = t.settings.interfaceMode;

  return (
    <SettingsControlRow
      id={id}
      title={copy.rowTitle}
      description={copy.rowDescription}
      icon={<Orbit size={16} strokeWidth={1.8} />}
      tone="blue"
      stacked
      control={
        <SegmentedControl<InterfaceMode>
          fill
          groupLabel={copy.rowTitle}
          value={interfaceMode}
          onChange={setInterfaceMode}
          options={[
            {
              value: "standard",
              content: copy.standardShort,
              label: copy.standardTitle,
            },
            {
              value: "yumi-cosmic",
              content: copy.cosmicShort,
              label: copy.cosmicTitle,
            },
          ]}
        />
      }
    />
  );
}
