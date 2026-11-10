"use client";

import { useMemo, useRef } from "react";

import { createPreviewHangyumi, createPreviewSaveWord } from "@/lib/hangyumi/service";
import type { LanguageCode } from "@/lib/languages";
import { shopItem, type YumiOutfit } from "@/lib/shop/catalog";

import HangyumiGame, { type GameKind } from "./HangyumiGame";

/** The game against the in-memory service and its practice words. */
export default function HangyumiGameReview({ learningLanguage, earnedToday, game = "hangyumi", streak = 0, voyages = 0, walletDelayMs = 0 }: {
  learningLanguage: LanguageCode;
  earnedToday: number;
  game?: GameKind;
  /** Wordvault: words already won in a row, to reach a chest by link. */
  streak?: number;
  /** Starweaver: voyages already made, so ?voyages=6 plays the seventh. */
  voyages?: number;
  /** How late the wallet answers, as a slow network would. */
  walletDelayMs?: number;
}) {
  const service = useMemo(() => createPreviewHangyumi({ earnedToday, streak, voyages }), [earnedToday, streak, voyages]);
  /* The preview's wardrobe, in memory: what she wears, and what a relic changes. */
  const worn = useRef<YumiOutfit>({ head: "beret" });
  const loadWallet = useMemo(() => async () => {
    if (walletDelayMs) await new Promise(resolve => setTimeout(resolve, walletDelayMs));
    return { outfit: worn.current, balance: 240 };
  }, [walletDelayMs]);
  const wearPiece = useMemo(() => async (itemId: string) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const piece = shopItem(itemId);
    if (!piece) throw new Error("Unknown piece.");
    worn.current = { ...worn.current, [piece.slot]: itemId };
    return worn.current;
  }, []);
  const saveWord = useMemo(() => createPreviewSaveWord(), []);
  return (
    <HangyumiGame
      service={service}
      defaultLanguage={learningLanguage}
      loadWallet={loadWallet}
      saveWord={saveWord}
      backHref="/games-review"
      game={game}
      wearPiece={wearPiece}
    />
  );
}
