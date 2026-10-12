"use client";

import Link from "next/link";
import { useRef } from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTuckOnScroll from "@/hooks/home/useTuckOnScroll";
import useTranslation from "@/hooks/i18n/useTranslation";

import styles from "./HomeShopKey.module.css";

/**
 * The way into Yumi's shop, in Home's top corner beside the mode switch
 * (Chi, 2026-10-12: "在主頁的右上角加入一個商城icon").
 *
 * In both homes, in the same place, so a reader who learnt it in one finds
 * it in the other. It steps away with the switch as the page leaves the top,
 * and hides with it whenever something else has the screen.
 */
export default function HomeShopKey() {
  const { isCosmic } = useInterfaceMode();
  const { t } = useTranslation();
  const linkRef = useRef<HTMLAnchorElement>(null);
  useTuckOnScroll(linkRef);

  return (
    <Link
      ref={linkRef}
      href="/shop"
      className={styles.key}
      data-home-shop-key=""
      data-cosmic={isCosmic ? "true" : "false"}
      aria-label={t.shop.title}
      title={t.shop.title}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.bag}>
        {/* A boutique bag, with Yumi's own C for its clasp. */}
        <path d="M5.2 8.4h13.6l-1.1 11.2a1.6 1.6 0 0 1-1.6 1.4H7.9a1.6 1.6 0 0 1-1.6-1.4Z" />
        <path d="M8.7 8.4V7a3.3 3.3 0 0 1 6.6 0v1.4" fill="none" />
        <path className={styles.clasp} d="M13.7 13.1a2.2 2.2 0 1 0 0 2.6" fill="none" />
      </svg>
    </Link>
  );
}
