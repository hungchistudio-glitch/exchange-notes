"use client";

import { Target } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  getDailyGoalMinutes,
  setDailyGoalMinutes,
  subscribeToDailyGoalMinutes,
  type DailyGoalMinutes,
} from "@/lib/appPreferences";

const DAILY_GOAL_OPTIONS: Array<{
  value: DailyGoalMinutes;
  key: "five" | "ten" | "fifteen" | "twenty" | "thirty";
}> = [
  { value: 5, key: "five" },
  { value: 10, key: "ten" },
  { value: 15, key: "fifteen" },
  { value: 20, key: "twenty" },
  { value: 30, key: "thirty" },
];

export default function DailyGoalSettingsButton() {
  const [open, setOpen] = useState(false);

  /**
   * The stored goal is an external store, not component state. Both snapshots
   * use getDailyGoalMinutes because it already returns the default when there
   * is no window, keeping the server and client renders identical.
   */
  const goal = useSyncExternalStore(
    subscribeToDailyGoalMinutes,
    getDailyGoalMinutes,
    getDailyGoalMinutes,
  );

  const { t } = useTranslation();
  const copy = t.settings.dailyGoal;

  function handleSelect(value: DailyGoalMinutes) {
    setDailyGoalMinutes(value);
    setOpen(false);
  }

  return (
    <>
      <SettingsRow
        title={copy.rowTitle}
        description={copy.rowDescription}
        value={`${goal} ${copy.minutesLabel}`}
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
