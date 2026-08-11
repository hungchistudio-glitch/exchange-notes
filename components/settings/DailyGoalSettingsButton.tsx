"use client";

import { Target } from "lucide-react";
import { useState } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDailyGoalWords from "@/hooks/preferences/useDailyGoalWords";
import {
  setDailyGoalWords,
  type DailyGoalWords,
} from "@/lib/appPreferences";

const DAILY_GOAL_OPTIONS: Array<{
  value: DailyGoalWords;
  key: "three" | "five" | "ten" | "twenty" | "thirtyThree";
}> = [
  { value: 3, key: "three" },
  { value: 5, key: "five" },
  { value: 10, key: "ten" },
  { value: 20, key: "twenty" },
  { value: 33, key: "thirtyThree" },
];

export default function DailyGoalSettingsButton() {
  const [open, setOpen] = useState(false);

  const goal = useDailyGoalWords();

  const { t } = useTranslation();
  const copy = t.settings.dailyGoal;

  function handleSelect(value: DailyGoalWords) {
    setDailyGoalWords(value);
    setOpen(false);
  }

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={`${goal} ${copy.wordsLabel}`}
        icon={<Target size={17} strokeWidth={1.8} />}
        onClick={() => setOpen(true)}
      />

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.sheetTitle}
        description={copy.sheetDescription}
      >
        <div className="space-y-3">
          {DAILY_GOAL_OPTIONS.map((option) => (
            <SettingsChoiceCard
              key={option.value}
              selected={goal === option.value}
              badge={<span className="text-sm">{option.value}</span>}
              title={copy.options[option.key]}
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
