"use client";

import { useLayoutEffect, useRef } from "react";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import styles from "./HomeModePortal.module.css";

/** A separate orbit from the star, which still gathers the cookies. */
export default function HomeModePortal() {
  const { isCosmic, modeTransition, setInterfaceMode } = useInterfaceMode();
  const { t } = useTranslation();
  const previousMode = useRef(isCosmic);
  useLayoutEffect(() => {
    if (previousMode.current === isCosmic) return;
    previousMode.current = isCosmic;
    // Reposition under the opaque eclipse, never through smooth scrolling.
    document.querySelector<HTMLElement>("[data-app-scroll-viewport]")?.scrollTo({ top: 0, behavior: "instant" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [isCosmic]);
  const label = isCosmic ? t.settings.interfaceMode.returnStandard : t.settings.interfaceMode.enterCosmic;
  return (
    <button
      type="button"
      className={styles.portal}
      data-home-mode-portal=""
      data-cosmic={isCosmic ? "true" : "false"}
      aria-label={label}
      title={label}
      aria-pressed={isCosmic}
      aria-disabled={!!modeTransition}
      onClick={event => {
        if (modeTransition) return;
        const box = event.currentTarget.getBoundingClientRect();
        setInterfaceMode(isCosmic ? "standard" : "yumi-cosmic", { x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
    >
      <span className={styles.corona} aria-hidden="true" />
      <span className={styles.planet} aria-hidden="true" />
      <span className={styles.satellite} aria-hidden="true" />
    </button>
  );
}
