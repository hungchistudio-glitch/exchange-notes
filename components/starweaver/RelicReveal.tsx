"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import ShopThumb from "@/components/shop/ShopThumb";
import useReducedMotion from "@/hooks/useReducedMotion";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import type { ShopItem } from "@/lib/shop/catalog";
import type { RevealPalette } from "@/lib/starweaver/relicShowcase";

import styles from "@/components/hangyumi/Hangyumi.module.css";

/** Any piece a game unlocks, with the line the reveal says about it. */
export type RevealPiece = ShopItem & { intro: ShopItem["names"] };

/** Whose piece: each collection in its own light. */
export type RevealCollection = "starweaver" | "nightscale" | "mythic" | "chest";

const PALETTE: Record<RevealCollection, RevealPalette> = { starweaver: "ice", nightscale: "gold", mythic: "gilt", chest: "gilt" };

type Props = {
  item: RevealPiece;
  collection: RevealCollection;
  language: InterfaceLanguage;
  labels: {
    title: string;
    seal: string;
    wear: string;
    wearing: string;
    worn: string;
    wearFailed: string;
    carryOn: string;
    close: string;
  };
  /** How putting it on is going, for this round. */
  wear: "wearing" | "worn" | "failed" | null;
  isWorn: boolean;
  /** Absent where the page cannot dress her (the review screens). */
  onWear?: () => void;
  onCarryOn: () => void;
  onClose: () => void;
};

const subscribeNothing = () => () => {};

/**
 * A piece a game unlocks, shown whole. First Starweaver's relics (Chi,
 * 2026-11-11: the gate sends it out, then a full-screen showing); then, the
 * same day, every game's (Chi: "三款遊戲當解開神秘物品時都要做顯示神秘物品
 * 的畫面動畫"): Hangyumi's Nightscale piece, lowered on the empty line, and
 * Wordvault's Mythic Vault piece, flown out of the chest. Each studio has
 * just sent it towards us; here the screen goes dark round it, it turns in
 * its collection's light (lib/starweaver/relicShowcase.ts), and its number
 * or origin, its name and a line about it come up in turn, then the way to
 * wear it or carry on. Its shop picture stands in until the 3D one is
 * drawn, and for good where WebGL cannot be had.
 *
 * Nothing here awards anything: the server put the relic in the wardrobe
 * before the page heard of it.
 */
export default function RelicReveal({ item, collection, language, labels, wear, isWorn, onWear, onCarryOn, onClose }: Props) {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const [live, setLive] = useState(false);
  const nameId = useId();
  const introId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  /* The 3D relic, loaded only now: three.js is already on its way for the stage. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!mounted || !canvas) return;
    let cancelled = false;
    let dispose: (() => void) | null = null;
    void import("@/lib/starweaver/relicShowcase").then(({ createRelicShowcase }) => {
      if (cancelled) return;
      const showcase = createRelicShowcase(canvas, item.id, { reducedMotion, palette: PALETTE[collection] });
      if (!showcase) return;
      dispose = () => showcase.dispose();
      void showcase.ready.then(() => { if (!cancelled) setLive(true); });
    }, () => undefined);
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [mounted, item.id, reducedMotion, collection]);

  /* Focus comes in, stays in, and goes back where it was. Escape closes. */
  useEffect(() => {
    if (!mounted) return;
    const before = document.activeElement as HTMLElement | null;
    firstRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div
      ref={dialogRef}
      className={styles.reveal}
      role="dialog"
      aria-modal="true"
      aria-labelledby={nameId}
      aria-describedby={introId}
      data-reduced={reducedMotion ? "true" : "false"}
      data-collection={collection}
    >
      <div className={styles.revealBurst} aria-hidden="true" />
      <button type="button" className={styles.revealClose} onClick={onClose} aria-label={labels.close} title={labels.close}>
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      <div className={styles.revealBody}>
        <div className={styles.revealStage} data-live={live ? "true" : "false"}>
          <ShopThumb item={item} className={styles.revealThumb} />
          <canvas ref={canvasRef} className={styles.revealCanvas} aria-hidden="true" />
        </div>
        <p className={styles.revealTitle}>{labels.title}</p>
        <p className={styles.revealSeal}>{labels.seal}</p>
        <h2 id={nameId} className={styles.revealName}>{item.names[language]}</h2>
        <p id={introId} className={styles.revealIntro}>{item.intro[language]}</p>
        <div className={styles.revealActions}>
          {onWear && (
            <button
              ref={firstRef}
              type="button"
              className={styles.revealPrimary}
              disabled={isWorn || wear === "wearing"}
              onClick={onWear}
            >
              {isWorn ? labels.worn : wear === "wearing" ? labels.wearing : labels.wear}
            </button>
          )}
          <button ref={onWear ? undefined : firstRef} type="button" className={styles.revealSecondary} onClick={onCarryOn}>
            {labels.carryOn}
          </button>
        </div>
        {wear === "failed" && <p className={styles.revealError} role="alert">{labels.wearFailed}</p>}
      </div>
    </div>,
    document.body,
  );
}
