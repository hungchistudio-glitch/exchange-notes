"use client";

import { useMemo } from "react";

import { createPreviewHangyumi } from "@/lib/hangyumi/service";
import type { LanguageCode } from "@/lib/languages";

import HangyumiGame from "./HangyumiGame";

/** The game against the in-memory service and its practice words. */
export default function HangyumiGameReview({ learningLanguage, hintLanguage, earnedToday }: {
  learningLanguage: LanguageCode;
  hintLanguage: LanguageCode;
  earnedToday: number;
}) {
  const service = useMemo(() => createPreviewHangyumi({ earnedToday }), [earnedToday]);
  const loadOutfit = useMemo(() => async () => ({ head: "beret" }), []);
  return (
    <HangyumiGame
      service={service}
      defaultLanguage={learningLanguage}
      nativeLanguage={hintLanguage}
      loadOutfit={loadOutfit}
      backHref="/hangyumi-review"
    />
  );
}
