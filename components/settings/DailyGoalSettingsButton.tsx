"use client";

import { Target } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import SettingsRow from "@/components/foundation/rows/SettingsRow";
import SettingsChoiceCard from "@/components/settings/SettingsChoiceCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import { createClient } from "@/lib/supabase/client";
import {
  getDailyGoalWords,
  setDailyGoalWords,
  subscribeToDailyGoalWords,
  type DailyGoalWords,
} from "@/lib/appPreferences";

const DAILY_GOAL_OPTIONS: Array<{
  value: DailyGoalWords;
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
   * use getDailyGoalWords because it already returns the default when there
   * is no window, keeping the server and client renders identical.
   */
  const goal = useSyncExternalStore(
    subscribeToDailyGoalWords,
    getDailyGoalWords,
    getDailyGoalWords,
  );

  const { t } = useTranslation();
  const copy = t.settings.dailyGoal;

  /*
   * Written twice, deliberately. The local store is what every screen reads,
   * so it changes now and without a round trip; the profile copy is what the
   * reminder cron reads, and it is the only reason the server knows the goal
   * at all. The local write is not rolled back if the remote one fails —
   * the choice is still true of this device, and the next change will carry
   * it up.
   */
  async function persist(value: DailyGoalWords) {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ daily_goal_words: value })
      .eq("id", user.id);

    if (error) {
      console.warn("Daily goal could not be saved to the profile.", error);
    }
  }

  function handleSelect(value: DailyGoalWords) {
    setDailyGoalWords(value);
    setOpen(false);
    void persist(value);
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
