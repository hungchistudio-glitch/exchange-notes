"use client";

import { Type } from "lucide-react";
import { useEffect, useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  DEFAULT_APP_FONT_SIZE,
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
  const [fontSize, setFontSizeState] = useState<AppFontSize>(
    DEFAULT_APP_FONT_SIZE,
  );

  const { t } = useTranslation();
  const copy = t.settings.fontSize;

  useEffect(() => {
    setFontSizeState(getAppFontSize());

    return subscribeToAppFontSize(setFontSizeState);
  }, []);

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
