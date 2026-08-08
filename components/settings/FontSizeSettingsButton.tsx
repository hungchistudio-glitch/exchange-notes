"use client";

import { Type } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getAppFontSize,
  setAppFontSize,
  subscribeToAppFontSize,
  type AppFontSize,
} from "@/lib/appPreferences";

const FONT_SIZE_OPTIONS: Array<{
  value: AppFontSize;
  previewClassName: string;
}> = [
  { value: "small", previewClassName: "text-[14px]" },
  { value: "medium", previewClassName: "text-[16px]" },
  { value: "large", previewClassName: "text-[18px]" },
];

export default function FontSizeSettingsButton() {
  const [open, setOpen] = useState(false);

  /**
   * The stored preference is an external store, not component state, so it is
   * read through useSyncExternalStore rather than copied in on mount. Both
   * snapshots use getAppFontSize because it already returns the default when
   * there is no window, which keeps the server and client renders identical.
   */
  const fontSize = useSyncExternalStore(
    subscribeToAppFontSize,
    getAppFontSize,
    getAppFontSize,
  );

  const { t } = useTranslation();
  const copy = t.settings.fontSize;

  function handleSelect(value: AppFontSize) {
    setAppFontSize(value);
  }

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={copy.options[fontSize].label}
        tone="amber"
        icon={<Type size={17} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
      >
        <div className="space-y-3">
          {FONT_SIZE_OPTIONS.map((option) => {
            const optionCopy = copy.options[option.value];

            return (
              <SettingsChoiceCard
                key={option.value}
                selected={fontSize === option.value}
                badge={<span className={option.previewClassName}>Aa</span>}
                title={optionCopy.label}
                description={optionCopy.description}
                onClick={() => handleSelect(option.value)}
              />
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
