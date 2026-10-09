"use client";

import { Sparkles } from "lucide-react";
import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import useTranslation from "@/hooks/i18n/useTranslation";
import { requestCookieGather } from "@/lib/home/cookieGather";
import { floatingCopy } from "@/lib/home/floatingCopy";
import styles from "./HomeGatherStar.module.css";

/**
 * The star in Standard's top corner, which gathers the cookies to Yumi.
 *
 * Part of the home rather than of the cookie field, so it is on screen from
 * the first frame and stays there: before her scene is live, with no cookies,
 * during a search (where a press takes her home and then gathers), and
 * through a mode crossing. Cosmic does not mount it.
 */
export default function HomeGatherStar() {
  const { language } = useTranslation();
  const label = floatingCopy[language].gather;
  return (
    <OverlayPortal>
      <div className={styles.star} data-home-gather-star="" data-yumi-protected="">
        <button type="button" className={styles.button} aria-label={label} title={label} onClick={requestCookieGather}>
          <Sparkles size={20} aria-hidden="true" />
        </button>
      </div>
    </OverlayPortal>
  );
}
