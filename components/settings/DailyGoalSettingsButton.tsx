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

/*
 * The two goals the free AI quota cannot promise.
 *
 * Word lookups draw on one allowance shared by everybody on the app — about
 * forty new words a day between all readers once news, phonetics and the
 * camera have had theirs (measured 2026-09-28). A reader chasing twenty or
 * thirty-three brand-new words would meet the limit before the goal. They
 * stay choosable, with a line saying so, rather than disappearing: the
 * number is the reader's to pick, and the limit is ours to be honest about.
 */
const HEAVY_GOALS: ReadonlySet<DailyGoalWords> = new Set([20, 33]);

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
              description={
                HEAVY_GOALS.has(option.value) ? copy.heavyNote : undefined
              }
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
