import { useCallback, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";

/** Turned edge-on, the answer put in, and turned back. */
export const TURN_OVER: readonly [Keyframe[], Keyframe[]] = [
  [{ transform: "perspective(1400px) rotateY(0deg)" }, { transform: "perspective(1400px) rotateY(90deg)" }],
  [{ transform: "perspective(1400px) rotateY(-90deg)" }, { transform: "perspective(1400px) rotateY(0deg)" }],
];

/** Away to the left, the next card in from the right. */
export const NEXT_CARD: readonly [Keyframe[], Keyframe[]] = [
  [{ transform: "none", opacity: 1 }, { transform: "translateX(-40px) rotate(-1.5deg)", opacity: 0 }],
  [{ transform: "translateX(40px) rotate(1.5deg)", opacity: 0 }, { transform: "none", opacity: 1 }],
];

/**
 * A review card's movements (Chi, 2026-10-24): it turns over to show its
 * answer, and slides away once graded. Each is out, a change made while
 * the card is edge-on or gone (so its new height never shows as a jump),
 * and in again. One at a time. Without Web Animations (jsdom), or under
 * reduced motion, just the change.
 */
export default function useCardMotion(cardRef: RefObject<HTMLElement | null>) {
  const moving = useRef(false);

  return useCallback(async ([out, back]: readonly [Keyframe[], Keyframe[]], change: () => void) => {
    const card = cardRef.current;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!card?.animate || still) {
      change();
      return;
    }
    if (moving.current) return;
    moving.current = true;
    try {
      const leaving = card.animate(out, { duration: 170, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
      await leaving.finished.catch(() => {});
      flushSync(change);
      card.animate(back, { duration: 260, easing: "cubic-bezier(0,0,.2,1)" });
      leaving.cancel();
    } finally {
      moving.current = false;
    }
  }, [cardRef]);
}
