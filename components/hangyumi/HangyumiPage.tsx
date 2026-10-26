"use client";

import { useCallback, useMemo } from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { createSupabaseHangyumi, type SaveWord } from "@/lib/hangyumi/service";
import { INTERFACE_LANGUAGE_CODE, resolveSupportLanguage } from "@/lib/languages";
import { createSupabaseWallet } from "@/lib/shop/wallet";
import { createClient } from "@/lib/supabase/client";
import { DuplicateVocabularyError, createVocabularyEntry } from "@/lib/vocabulary/createEntry";

import HangyumiGame from "./HangyumiGame";

/** Hangyumi as a signed-in reader plays it: their language, their cookies, their Yumi. */
export default function HangyumiPage() {
  const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
  const { language: interfaceLanguage } = useTranslation();
  const supabase = useMemo(() => createClient(), []);
  const service = useMemo(() => createSupabaseHangyumi(supabase), [supabase]);
  const loadOutfit = useCallback(async () => (await createSupabaseWallet(supabase).load()).outfit, [supabase]);

  /*
   * A finished round's word, into the vocabulary through the same door as
   * every other save (lib/vocabulary/createEntry): the same duplicate
   * check, the same three cookies for a first save. Glossed in the
   * reader's own language, through the app's cached word translation; if
   * none can be had (offline, or the day's translations spent), the clue
   * the round was played with stands in, in its own language.
   */
  const saveWord = useCallback<SaveWord>(async word => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");
    const target = resolveSupportLanguage(word.language, INTERFACE_LANGUAGE_CODE[interfaceLanguage], nativeLanguage);
    let translation = "";
    try {
      const response = await fetch("/api/text-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [word.answer], from: word.language, to: target }),
      });
      const body = (await response.json()) as { texts?: Record<string, string> };
      translation = body.texts?.[word.answer]?.trim() ?? "";
    } catch {
      translation = "";
    }
    const glossLanguage = translation ? target : word.hintLanguage;
    try {
      await createVocabularyEntry({
        userId: user.id,
        term: word.answer,
        translation: translation || word.hint,
        partOfSpeech: word.partOfSpeech,
        confidence: "medium",
        category: "other",
        status: "new",
        language: {
          pair: [word.language, glossLanguage],
          stated: { term: word.language, translation: glossLanguage },
        },
      });
      return "saved";
    } catch (error) {
      if (error instanceof DuplicateVocabularyError) return "duplicate";
      throw error;
    }
  }, [supabase, interfaceLanguage, nativeLanguage]);

  return (
    <HangyumiGame
      service={service}
      defaultLanguage={learningLanguage}
      loadOutfit={loadOutfit}
      saveWord={saveWord}
    />
  );
}
