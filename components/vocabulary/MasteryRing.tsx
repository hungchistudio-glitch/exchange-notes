import type { VocabularyItem } from "@/lib/types/app";
import { masteryProgress } from "@/lib/vocabulary/mastery";

import styles from "./MasteryRing.module.css";

/**
 * A word's progress towards mastered, as a ring in its status's colour
 * (Chi, 2026-10-24: the three statuses were one grey word). Decorative:
 * the status label beside it says the same in words.
 */
export default function MasteryRing({ item, size = 14 }: {
  item: Pick<VocabularyItem, "status" | "review_repetitions" | "review_interval">;
  size?: number;
}) {
  const progress = masteryProgress(item);
  const radius = 5.5;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      className={styles.ring}
      data-status={item.status}
      width={size}
      height={size}
      viewBox="0 0 14 14"
      aria-hidden="true"
    >
      <circle className={styles.track} cx="7" cy="7" r={radius} />
      <circle
        className={styles.fill}
        cx="7"
        cy="7"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
      />
      {item.status === "mastered" && <circle className={styles.core} cx="7" cy="7" r="2.2" />}
    </svg>
  );
}

/** The status label's colour, for the word beside the ring. */
export const statusClassName = styles.status;
