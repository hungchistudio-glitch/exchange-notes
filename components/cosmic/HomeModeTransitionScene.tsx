"use client";

import { useEffect, useLayoutEffect, type CSSProperties } from "react";
import { useInterfaceMode, type ModeTransitionPhase } from "@/contexts/InterfaceModeContext";
import { HOME_COVER_MS, HOME_REVEAL_MS, isHomeModeReady, type HomeModeTransition } from "@/lib/home/modeTransition";
import { leaseInlineStyles } from "@/lib/ui/inlineStyleLease";
import useTranslation from "@/hooks/i18n/useTranslation";
import styles from "./HomeModeTransitionScene.module.css";

/** The home being entered starts at its top, where the switch is. */
function scrollToTop() {
  const scroller = document.querySelector<HTMLElement>("[data-app-scroll-viewport]");
  if (scroller) scroller.scrollTop = 0;
  else window.scrollTo({ top: 0, behavior: "instant" });
}

/**
 * The veil between the two homes.
 *
 * One viewport-sized layer in the colour of the home being entered, so the
 * old home dissolves into the new one's ground and the new one settles out
 * of it — never a flash through a third colour. Only its opacity animates,
 * which the compositor does on its own, and the shells are swapped, scrolled
 * and drawn only while it is opaque.
 */
export default function HomeModeTransitionScene({ phase, transition }: {
  phase: ModeTransitionPhase;
  transition: HomeModeTransition;
}) {
  const { coverHomeMode, revealHomeMode, finishHomeMode } = useInterfaceMode();
  const { t } = useTranslation();
  const ready = isHomeModeReady(transition);

  /* Nothing scrolls under the veil — a flick that was still coasting when
     the switch was pressed must not carry the new home somewhere else. */
  useLayoutEffect(() => {
    const root = document.documentElement;
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll-viewport]");
    const releaseRoot = leaseInlineStyles(root, { overflow: "hidden", "scroll-behavior": "auto", "overflow-anchor": "none" });
    const releaseScroller = scroller ? leaseInlineStyles(scroller, {
      "overflow-y": "hidden", "scroll-behavior": "auto", "overflow-anchor": "none",
      // Keep a desktop scrollbar's space, so locking it does not reflow the
      // home that is still visible while the veil comes up.
      "scrollbar-gutter": scroller.offsetWidth > scroller.clientWidth ? "stable" : "auto",
    }) : null;
    return () => { releaseScroller?.(); releaseRoot(); };
  }, []);

  // The new home is mounted in the same commit that enters "waiting".
  useLayoutEffect(() => {
    if (transition.step === "waiting") scrollToTop();
  }, [transition.step]);

  useEffect(() => {
    if (transition.step !== "waiting" || !ready) return;
    /* Everything has reported. Give React's follow-up commit and the browser
       one whole painted frame, then make sure of the top once more — content
       that arrived while waiting can have anchored the scroll elsewhere — and
       lift. */
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        scrollToTop();
        revealHomeMode();
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [transition.step, ready, revealHomeMode]);

  useEffect(() => {
    /* A page in the background runs no animations, so their end events would
       never come; and a reader who has just asked for less motion should not
       sit through the rest of this one. Either way, land now. */
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => { if (media.matches) finishHomeMode(); };
    const onHidden = () => { if (document.visibilityState !== "visible") finishHomeMode(); };
    media.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      media.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [finishHomeMode]);

  return <div className={styles.stage}
    data-home-mode-transition={transition.step}
    data-target={transition.target}
    data-ready={transition.ready.join(" ") || undefined}
    role="status" aria-live="polite"
    style={{ "--cover-ms": `${HOME_COVER_MS}ms`, "--reveal-ms": `${HOME_REVEAL_MS}ms` } as CSSProperties}
    onAnimationEnd={event => {
      if (event.target !== event.currentTarget) return;
      if (transition.step === "covering") coverHomeMode();
      else if (transition.step === "revealing") finishHomeMode();
    }}>
    <span className="sr-only">{phase === "entering-cosmic" ? t.cosmic.transition.entering : t.cosmic.transition.leaving}</span>
  </div>;
}
