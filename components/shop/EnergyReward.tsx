"use client";

import { useEffect, useId } from "react";

import RollingNumber from "@/components/foundation/motion/RollingNumber";

import { interfaceSounds } from "@/lib/sound/interfaceSounds";

import EnergyCookie from "./EnergyCookie";
import styles from "./EnergyReward.module.css";

/** When each little capsule reaches the balance and clicks open, ms. */
const OPENS = [360, 450, 540];

/**
 * Capsules landing (Chi, 2026-10-13: "得到能量餅乾的時候都應該要有一個開心的動畫";
 * 2026-11-21: 膠囊飛進餘額、啢一聲打開).
 *
 * Only ever shown for capsules the server has already credited. Three
 * small energy capsules arc up into the card one after another; each
 * clicks open as it reaches the balance, its halves parting and its light
 * going into the capsule there, which swells once with it. The amount
 * counts in beside it, and a small Yumi hops and blinks. About 0.8 s,
 * never in the way of a tap; the click is heard only where the reader has
 * interface sounds on. Under reduced motion it simply fades in.
 */
export default function EnergyReward({ amount, label }: { amount: number; label: string }) {
  /* Each reward counts up from 0 on its own wheels (RollingNumber). */
  const rewardId = useId();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* A small tap from the phone as it lands, where the phone can (not iOS). */
    try {
      navigator.vibrate?.(12);
    } catch {
      // Not allowed here: the picture is enough.
    }
    const timers = OPENS.map(at => window.setTimeout(() => interfaceSounds.capsule(), at));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, []);

  return (
    <div className={styles.reward} role="status" aria-live="polite">
      <span className={styles.yumi} aria-hidden="true"><i /></span>
      <span className={styles.coin} aria-hidden="true">
        <EnergyCookie className={styles.cookie} />
        <span className={styles.glow} />
        {OPENS.map((at, index) => (
          <span key={at} className={styles.flyer} style={{ ["--fly-delay" as string]: `${at - 360}ms`, ["--fly-from" as string]: `${-34 + index * 9}px` }}>
            <i className={styles.halfAmber} />
            <i className={styles.halfGlass} />
            <b className={styles.spark} />
          </span>
        ))}
      </span>
      <span className={styles.text}>
        <strong>
          {/* Read whole; the wheels are only drawn. */}
          <span className="sr-only">+{amount}</span>
          <span aria-hidden="true">+<RollingNumber value={amount} remember={`reward${rewardId}`} fromZero /></span>
        </strong>
        <span>{label}</span>
      </span>
    </div>
  );
}
