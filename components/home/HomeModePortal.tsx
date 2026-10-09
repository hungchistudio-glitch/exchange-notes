"use client";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import styles from "./HomeModePortal.module.css";

/**
 * The switch between the two homes, beside the star (which gathers cookies).
 *
 * A small machined slider rather than a portal into space (Chi, 2026-10-09:
 * "更優雅的裝置按鈕感"): a recessed slot and a thumb that moves the moment it
 * is pressed. It is the one piece of hardware that does not change while the
 * screen behind it does — during a crossing it stands above the veil, already
 * in its new position and colour, so the press is answered at once and the
 * reader's eye has somewhere still to rest.
 */
export default function HomeModePortal() {
  const { isCosmic, modeTransition, homeModeTransition, setInterfaceMode } = useInterfaceMode();
  const { t } = useTranslation();
  /* Where the switch has been put, which during a crossing is ahead of the
     mode itself: that only commits once the veil is opaque. */
  const showsCosmic = homeModeTransition ? homeModeTransition.target === "yumi-cosmic" : isCosmic;
  const label = isCosmic ? t.settings.interfaceMode.returnStandard : t.settings.interfaceMode.enterCosmic;
  return (
    <button
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
        const scroller = document.querySelector<HTMLElement>("[data-app-scroll-viewport]");
        setInterfaceMode(isCosmic ? "standard" : "yumi-cosmic", { home: true, scrollTop: scroller?.scrollTop ?? window.scrollY });
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
