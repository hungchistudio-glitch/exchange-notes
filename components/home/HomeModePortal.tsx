"use client";

import { useEffect, useRef } from "react";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import styles from "./HomeModePortal.module.css";

/** How far the page scrolls before the switch has fully stepped away, in px. */
const TUCK_DISTANCE = 40;

/**
 * The switch between the two homes, beside the star (which gathers cookies).
 *
 * A small machined slider rather than a portal into space (Chi, 2026-10-09:
 * "更優雅的裝置按鈕感"): a recessed slot and a thumb that moves the moment it
 * is pressed. It is the one piece of hardware that does not change while the
 * screen behind it does — during a crossing it stands above the veil, already
 * in its new position and colour, so the press is answered at once and the
 * reader's eye has somewhere still to rest.
 *
 * It belongs to the top of each home. The deck scrolls, and a switch pinned
 * over it sat on whatever passed underneath — at the bottom of the deck,
 * exactly on OmniLexicon's Scan key, so reaching for the camera could change
 * the whole interface. So it steps away as the page leaves the top, and is
 * back the moment the page returns there; every crossing lands at the top.
 */
export default function HomeModePortal() {
  const { isCosmic, modeTransition, homeModeTransition, setInterfaceMode } = useInterfaceMode();
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);

  /* Written straight onto the element, once a frame at most: a scroll is
     sixty updates a second, and none of them is React's business. */
  useEffect(() => {
    const button = buttonRef.current;
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll-viewport]");
    if (!button) return;
    let frame = 0;
    let shown = Number.NaN;
    const read = () => {
      frame = 0;
      const top = scroller ? scroller.scrollTop : window.scrollY;
      const tuck = Math.min(1, Math.max(0, top / TUCK_DISTANCE));
      if (tuck === shown) return;
      shown = tuck;
      button.style.setProperty("--tuck", tuck.toFixed(3));
      if (tuck > 0.5) button.setAttribute("data-tucked", "true");
      else button.removeAttribute("data-tucked");
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  /* Where the switch has been put, which during a crossing is ahead of the
     mode itself: that only commits once the veil is opaque. */
  const showsCosmic = homeModeTransition ? homeModeTransition.target === "yumi-cosmic" : isCosmic;
  const label = isCosmic ? t.settings.interfaceMode.returnStandard : t.settings.interfaceMode.enterCosmic;
  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.portal}
      data-home-mode-portal=""
      data-cosmic={showsCosmic ? "true" : "false"}
      data-crossing={homeModeTransition ? "true" : undefined}
      aria-label={label}
      title={label}
      aria-pressed={isCosmic}
      aria-disabled={!!modeTransition}
      onClick={() => {
        if (modeTransition) return;
        /* Standard's floating cookies load only once her scene is live, and
           the veil waits for them. On a first visit fetch them while it is
           still coming up, rather than after. */
        if (isCosmic) void import("@/components/home/yumi/FloatingCookieField").catch(() => {});
        setInterfaceMode(isCosmic ? "standard" : "yumi-cosmic", { home: true });
      }}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.mark} data-side="standard" />
        <span className={styles.mark} data-side="cosmic" />
        <span className={styles.thumb}><span className={styles.lamp} /></span>
      </span>
    </button>
  );
}
