"use client";

import { useMemo } from "react";

import { createPreviewHangyumi, createPreviewSaveWord } from "@/lib/hangyumi/service";
import type { LanguageCode } from "@/lib/languages";

import HangyumiGame from "./HangyumiGame";

/** The game against the in-memory service and its practice words. */
export default function HangyumiGameReview({ learningLanguage, earnedToday }: {
  learningLanguage: LanguageCode;
  earnedToday: number;
}) {
  const service = useMemo(() => createPreviewHangyumi({ earnedToday }), [earnedToday]);
  const loadWallet = useMemo(() => async () => ({ outfit: { head: "beret" }, balance: 240 }), []);
  const saveWord = useMemo(() => createPreviewSaveWord(), []);
  return (
    <HangyumiGame
      service={service}
      defaultLanguage={learningLanguage}
      loadWallet={loadWallet}
      saveWord={saveWord}
      backHref="/hangyumi-review"
    />
  );
}
