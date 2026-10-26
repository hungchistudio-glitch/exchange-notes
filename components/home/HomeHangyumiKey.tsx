"use client";

import Link from "next/link";
import { useRef } from "react";

import HangyumiGlyph from "@/components/hangyumi/HangyumiGlyph";
import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTuckOnScroll from "@/hooks/home/useTuckOnScroll";
import useTranslation from "@/hooks/i18n/useTranslation";

import styles from "./HomeShopKey.module.css";

/**
 * The way into the games, beside the shop's key in Home's top corner (Chi,
 * 2026-10-25: a minimal line icon next to the shop). It is the shop key's
 * twin in every way but its mark: the same target, the same ink, stepping
 * away and hiding with it. One key for both games (Chi, 2026-10-26): it
 * opens the hub, where Hangyumi and Yumi Wordvault are chosen.
 */
export default function HomeHangyumiKey() {
  const { isCosmic } = useInterfaceMode();
  const { t } = useTranslation();
  const linkRef = useRef<HTMLAnchorElement>(null);
  useTuckOnScroll(linkRef);

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
    >
      <HangyumiGlyph className={styles.bag} accentClassName={styles.clasp} />
    </Link>
  );
}
