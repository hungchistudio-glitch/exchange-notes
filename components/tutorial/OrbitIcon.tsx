"use client";

import { useEffect, useState, type ReactNode } from "react";

import styles from "@/components/tutorial/TutorialStage.module.css";

/* Matches the pressPulse / pressRipple cycle in the stylesheet. The dip lands
   at 30% of it, so the active state is switched on to meet the finger. */
const CYCLE_MS = 2400;
const PRESS_AT_MS = 700;
const HOLD_MS = 1150;

type OrbitIconProps = {
  /** Receives the live pressed state so the icon can show its own active art. */
  render: (active: boolean) => ReactNode;
};

/**
 * How the tour presents one of the app's icons: hairline rings, one of them
 * dashed and slowly turning, with the icon being pressed on a loop inside.
 *
 * The press is not an imitation. Every nav icon already ships an `active`
 * variant and a 220ms transition into it — thicker stroke, the orbital dash
 * shifting round, the core filling in — so the demonstration just supplies the
 * dip of a finger and lets the component do what it does when tapped for real.
 */
export default function OrbitIcon({ render }: OrbitIconProps) {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    /*
     * One slot, not a growing list.
     *
     * This used to push every release timer onto an array that was only
     * emptied on unmount, so a slide left open added an id every 2.4 seconds
     * and never dropped one. At most one release can ever be pending — each
     * beat cancels the one before it — so a single variable is both smaller
     * and the honest description of what is happening.
     */
    let release = 0;

    function beat() {
      window.clearTimeout(release);
      setPressed(true);
      release = window.setTimeout(() => setPressed(false), HOLD_MS);
    }

    // State is only ever assigned from these callbacks, never from the effect
    // body, which is what keeps this clear of the set-state-in-effect rule.
    const first = window.setTimeout(beat, PRESS_AT_MS);
    const interval = window.setInterval(beat, CYCLE_MS);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(release);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <span className="relative inline-flex h-28 w-28 shrink-0 items-center justify-center">
      <span aria-hidden="true" className={styles.orbitRing} />
      <span aria-hidden="true" className={styles.orbitDashed} />
      <span aria-hidden="true" className={styles.pressRipple} />

      <span
        className={`flex h-10 w-10 items-center justify-center text-black ${styles.pressPulse}`}
      >
        {render(pressed)}
      </span>
    </span>
  );
}
