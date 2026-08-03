import type { TranslationDictionary } from "@/lib/i18n/types";
import type { MurphMood } from "@/lib/pet/types";

import styles from "./PetStatCards.module.css";

type MascotCopy = TranslationDictionary["vocabulary"]["mascot"];

type PetStatCardsProps = {
  wordsToday: number;
  cookies: number;
  streakDays: number;
  mood: MurphMood;
  copy: MascotCopy;
};

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className={styles.card}>
      {/* Remounting on value change replays the pop-in keyframe — a cheap,
          declarative way to get a "numbers bounce when they change" feel
          without hand-rolled animation state. */}
      <span key={value} className={styles.value}>
        {value}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export default function PetStatCards({
  wordsToday,
  cookies,
  streakDays,
  mood,
  copy,
}: PetStatCardsProps) {
  return (
    <div className={styles.row}>
      <StatCard label={copy.statWordsToday} value={String(wordsToday)} />
      <StatCard label={copy.statCookies} value={String(cookies)} />
      <StatCard
        label={copy.statStreak}
        value={`${streakDays} ${copy.statStreakDays}`}
      />
      <StatCard label={copy.statMood} value={copy.moodShort[mood]} />
    </div>
  );
}
