"use client";

import { useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";

import styles from "./Mission.module.css";

const LAUNCH_MS = 700;

/**
 * The moment a review becomes a mission.
 *
 * Rendered over the session that has *already started* — the first question
 * is mounted, live and answerable behind this, and the overlay takes no
 * pointer events. Nothing is delayed to make room for the animation, which is
 * the only version of this worth shipping: a launch sequence that costs the
 * user 700ms before they can answer would be paid for on every single review.
 *
 * Replayed by remounting rather than by a prop: the caller gives this a `key`
 * that changes when a session starts, so a second review gets a second launch
 * without this needing to reset its own state mid-effect.
 */
export default function MissionLaunchStage() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), LAUNCH_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.launch} role="status" aria-live="polite">
      <span className={styles.launchRing} aria-hidden="true" />
      <span
        className={`${styles.launchRing} ${styles.launchRingInner}`}
        aria-hidden="true"
      />
      <span className="sr-only">{t.cosmic.mission.launching}</span>
    </div>
  );
}
