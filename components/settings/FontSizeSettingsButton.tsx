"use client";

import { Type } from "lucide-react";

import SegmentedControl from "@/components/foundation/forms/SegmentedControl";
import { SettingsControlRow } from "@/components/foundation/rows/SettingsRow";
import useTranslation from "@/hooks/i18n/useTranslation";
import useAppFontSize from "@/hooks/preferences/useAppFontSize";
import { setAppFontSize, type AppFontSize } from "@/lib/appPreferences";

const FONT_SIZE_CLASSES: Record<AppFontSize, string> = {
  small: "text-[13px]",
  medium: "text-[15px]",
  large: "text-[18px]",
};

/**
 * Three sizes, shown at their own size. A row that demonstrates the setting
 * is worth more than a screen that describes it.
 */
export default function FontSizeSettingsButton({ id }: { id?: string }) {
  /**
   * The stored preference is an external store, not component state, so it is
   * read through useSyncExternalStore rather than copied in on mount. Both
   * snapshots use getAppFontSize because it already returns the default when
   * there is no window, which keeps the server and client renders identical.
   */
  const fontSize = useAppFontSize();

  const { t } = useTranslation();
  const copy = t.settings.fontSize;

  return (
    <SettingsControlRow
      id={id}
      title={copy.rowTitle}
      description={copy.rowDescription}
      icon={<Type size={16} strokeWidth={1.8} />}
      stacked
      control={
        <SegmentedControl<AppFontSize>
          groupLabel={copy.rowTitle}
          value={fontSize}
          onChange={setAppFontSize}
          options={(["small", "medium", "large"] as const).map((value) => ({
            value,
            content: (
              <span className={`${FONT_SIZE_CLASSES[value]} leading-none`}>
                A
              </span>
            ),
            label: copy.options[value].label,
          }))}
        />
      }
    />
  );
}
