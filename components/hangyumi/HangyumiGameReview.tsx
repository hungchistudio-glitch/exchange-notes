"use client";

import { useMemo } from "react";

import { createPreviewHangyumi, createPreviewSaveWord } from "@/lib/hangyumi/service";
import type { LanguageCode } from "@/lib/languages";

import HangyumiGame, { type GameKind } from "./HangyumiGame";

/** The game against the in-memory service and its practice words. */
export default function HangyumiGameReview({ learningLanguage, earnedToday, game = "hangyumi", streak = 0 }: {
  learningLanguage: LanguageCode;
  earnedToday: number;
  game?: GameKind;
  /** Wordvault: words already won in a row, to reach a chest by link. */
  streak?: number;
}) {
  const service = useMemo(() => createPreviewHangyumi({ earnedToday, streak }), [earnedToday, streak]);
  const loadWallet = useMemo(() => async () => ({ outfit: { head: "beret" }, balance: 240 }), []);
  const saveWord = useMemo(() => createPreviewSaveWord(), []);
  return (
    <HangyumiGame
      service={service}
      defaultLanguage={learningLanguage}
      loadWallet={loadWallet}
      saveWord={saveWord}
      backHref="/games-review"
      game={game}
    />
  );
}
