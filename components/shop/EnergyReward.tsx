"use client";

import EnergyCookie from "./EnergyCookie";
import styles from "./EnergyReward.module.css";

/**
 * Cookies landing (Chi, 2026-10-13: "得到能量餅乾的時候都應該要有一個開心的動畫").
 *
 * Only ever shown for cookies the server has already credited. A cookie
 * arcs up into the card and settles, the amount counts in beside it, and a
 * small Yumi hops and blinks. About 0.7 s, never in the way of a tap; under
 * reduced motion it simply fades in.
 */
export default function EnergyReward({ amount, label }: { amount: number; label: string }) {
  return (
    <div className={styles.reward} role="status" aria-live="polite">
      <span className={styles.yumi} aria-hidden="true"><i /></span>
      <span className={styles.coin} aria-hidden="true">
        <EnergyCookie className={styles.cookie} />
        <span className={styles.glow} />
      </span>
      <span className={styles.text}>
        <strong>+{amount}</strong>
        <span>{label}</span>
      </span>
    </div>
  );
}
