"use client";

import { useCallback, useMemo } from "react";

import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { createSupabaseHangyumi, type SaveWord } from "@/lib/hangyumi/service";
import { INTERFACE_LANGUAGE_CODE, resolveSupportLanguage, type LanguageCode } from "@/lib/languages";
import { createSupabaseWallet } from "@/lib/shop/wallet";
import { createClient } from "@/lib/supabase/client";
import { DuplicateVocabularyError, createVocabularyEntry } from "@/lib/vocabulary/createEntry";

import HangyumiGame, { type GameKind } from "./HangyumiGame";

/** Hangyumi (or Yumi Wordvault) as a signed-in reader plays it: their
    language, their cookies, their Yumi. Both are entered from the games
    hub, and go back to it. */
export default function HangyumiPage({ game = "hangyumi" }: { game?: GameKind }) {
  const { learningLanguage, nativeLanguage } = useLearningLanguageContext();
  const { language: interfaceLanguage } = useTranslation();
  const supabase = useMemo(() => createClient(), []);
  const service = useMemo(() => createSupabaseHangyumi(supabase), [supabase]);
  const loadWallet = useCallback(async () => {
    const state = await createSupabaseWallet(supabase).load();
    return { outfit: state.outfit, balance: state.balance };
  }, [supabase]);

  /* A word's gloss through the app's cached translation; null when none can be had. */
  const translate = useCallback(async (text: string, from: LanguageCode, to: LanguageCode) => {
    try {
      const response = await fetch("/api/text-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [text], from, to }),
      });
      const body = (await response.json()) as { texts?: Record<string, string> };
      return body.texts?.[text]?.trim() || null;
    } catch {
      return null;
    }
  }, []);

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
    const target = word.translationLanguage
      ?? resolveSupportLanguage(word.language, INTERFACE_LANGUAGE_CODE[interfaceLanguage], nativeLanguage);
    const translation = word.translation ?? (await translate(word.answer, word.language, target)) ?? "";
    const glossLanguage = translation ? target : word.hintLanguage;
    try {
      await createVocabularyEntry({
        userId: user.id,
        term: word.answer,
        translation: translation || word.hint,
        /* The vocabulary has no idiom; a 成語 is kept as a phrase. */
        partOfSpeech: word.partOfSpeech === "idiom" ? "phrase" : word.partOfSpeech,
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
  }, [supabase, interfaceLanguage, nativeLanguage, translate]);

  return (
    <HangyumiGame
      service={service}
      defaultLanguage={learningLanguage}
      loadWallet={loadWallet}
      translate={translate}
      nativeLanguage={nativeLanguage}
      saveWord={saveWord}
      game={game}
      backHref="/games"
    />
  );
}
