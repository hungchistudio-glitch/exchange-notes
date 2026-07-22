"use client";

import { Type } from "lucide-react";
import { useEffect, useState } from "react";

import {
  BottomSheet,
  SettingsRow,
} from "@/components/foundation";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import { getSettingsCopy } from "@/components/settings/settingsCopy";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
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
  {
    value: "small",
    previewClassName: "text-[14px]",
  },
  {
    value: "medium",
    previewClassName: "text-[16px]",
  },
  {
    value: "large",
    previewClassName: "text-[18px]",
  },
];

export default function FontSizeSettingsButton() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSizeState] =
    useState<AppFontSize>(
      DEFAULT_APP_FONT_SIZE,
    );

  const language = useInterfaceLanguage();
  const copy = getSettingsCopy(language);

  useEffect(() => {
    setFontSizeState(getAppFontSize());

    return subscribeToAppFontSize(
      setFontSizeState,
    );
  }, []);

  function handleSelect(value: AppFontSize) {
    setAppFontSize(value);
  }

  return (
    <>
      <SettingsRow
        title={copy.fontSize.rowTitle}
        description={copy.fontSize.rowDescription}
        value={copy.fontSize.options[fontSize].label}
        icon={
          <Type
            size={17}
            strokeWidth={1.8}
          />
        }
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.fontSize.sheetTitle}
        description={copy.fontSize.sheetDescription}
      >
        <div className="space-y-3">
          {FONT_SIZE_OPTIONS.map((option) => {
            const optionCopy =
              copy.fontSize.options[option.value];

            return (
              <SettingsChoiceCard
                key={option.value}
                selected={
                  fontSize === option.value
                }
                badge={
                  <span
                    className={
                      option.previewClassName
                    }
                  >
                    Aa
                  </span>
                }
                title={optionCopy.label}
                description={
                  optionCopy.description
                }
                onClick={() =>
                  handleSelect(option.value)
                }
              />
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
