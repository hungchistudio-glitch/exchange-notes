"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import GamesGlyph from "@/components/games/GamesGlyph";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTuckOnScroll from "@/hooks/home/useTuckOnScroll";
import useTranslation from "@/hooks/i18n/useTranslation";

import styles from "./HomeShopKey.module.css";

/**
 * The way into the games, beside the shop's key in Home's top corner (Chi,
 * 2026-10-25: a minimal line icon next to the shop). It is the shop key's
 * twin in every way but its mark: the same target, the same ink, stepping
 * away and hiding with it. One key for both games (Chi, 2026-10-26): it
 * opens the hub, where Hangyumi and Yumi Wordvault are chosen, and wears a
 * game pad, the eye its button.
 */
export default function HomeHangyumiKey() {
  const { isCosmic } = useInterfaceMode();
  const { t } = useTranslation();
  const linkRef = useRef<HTMLAnchorElement>(null);
  useTuckOnScroll(linkRef);
  /* The ring's cut is fetched while Home is idle, so the press starts it at once. */
  useEffect(() => {
    const fetch = () => void import("@/lib/motion/sceneCuts").catch(() => {});
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(fetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(fetch, 2000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Link
      ref={linkRef}
      href="/games"
      className={styles.key}
      data-home-hangyumi-key=""
      data-slot="hangyumi"
      data-cosmic={isCosmic ? "true" : "false"}
      aria-label={t.games.open}
      title={t.games.open}
      onClick={event => {
        /* Through Yumi's ring into the games (lib/motion/sceneCuts.ts;
           Chi, 2026-11-22). Loaded on the press, not with the home; the
           link is then clicked again and let through to navigate. */
        const key = event.currentTarget;
        if (key.dataset.cutPassing === "true") {
          delete key.dataset.cutPassing;
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const follow = () => {
          key.dataset.cutPassing = "true";
          key.click();
        };
        void import("@/lib/motion/sceneCuts")
          .then(({ playRingThrough }) => playRingThrough(key, follow))
          .catch(follow);
      }}
    >
      <GamesGlyph className={styles.bag} accentClassName={styles.clasp} />
    </Link>
  );
}
