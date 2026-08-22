"use client";

import { getLanguage } from "@/lib/languages";
import type { SpeechLanguage } from "@/lib/speech";
import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle, Volume2 } from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { getPronunciation, type PronunciationResult } from "@/lib/pronunciation/getPronunciation";
import { getCurrentUser, insertVocabulary } from "@/lib/vocabulary/repository";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import type { TranslationDictionary } from "@/lib/i18n/types";

import { DISCOVER_COLORS, type DailyNewsCard, type VocabularyItem } from "./types";

type VocabularyDrawerProps = {
  card: DailyNewsCard | null;
  open: boolean;
  onClose: () => void;
  copy: TranslationDictionary["discover"];
  speakingKey: string | null;
  onSpeak: (
    key: string,
    text: string,
    language: SpeechLanguage
  ) => void;
};

function SpeakerButton({
  onClick,
  active,
  ariaLabel,
}: {
  onClick: () => void;
  active: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="cosmic-sonar flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft transition-transform active:scale-90"
    >
      <Volume2
        size={14}
        strokeWidth={1.8}
        className={active ? "animate-pulse" : ""}
      />
    </button>
  );
}

function SaveWordButton({
  onClick,
  saving,
  saved,
  ariaLabel,
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || saved}
      aria-label={ariaLabel}
      // Cosmic Mode holds a cyan seam on an engaged lock — see .cosmic-lock in
      // app/cosmic.css. Standard Mode ignores it and keeps the emerald fill.
      data-saved={saved}
      className={`cosmic-lock flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 disabled:active:scale-100 ${
        saved
          ? "bg-emerald-50 text-emerald-700"
          : "bg-black/[0.04] text-ink-soft"
      }`}
    >
      {saving ? (
        <LoaderCircle size={14} strokeWidth={1.8} className="animate-spin" />
      ) : saved ? (
        <BookmarkCheck size={14} strokeWidth={1.8} />
      ) : (
        <Bookmark size={14} strokeWidth={1.8} />
      )}
    </button>
  );
}

export default function VocabularyDrawer({
  card,
  open,
  onClose,
  copy,
  speakingKey,
  onSpeak,
}: VocabularyDrawerProps) {
  const { t } = useTranslation();
  const { languagePair } = useLearningLanguageContext();
  const [primaryLanguage, secondaryLanguage] = languagePair;
  const partOfSpeechLabels = t.vocabulary.detail.partOfSpeech;

  // Word-level IPA/zhuyin, fetched lazily per word and cached for the life
  // of this component (it stays mounted across drawer open/close, only
  // BottomSheet's `open` prop toggles). The ref-backed "already requested"
  // set avoids re-fetching the same word every time the drawer reopens or
  // the parent re-renders with a new `card` object reference.
  const [pronunciations, setPronunciations] = useState<
    Record<string, PronunciationResult>
  >({});
  const requestedKeysRef = useRef<Set<string>>(new Set());

  const [savedWordKeys, setSavedWordKeys] = useState<Set<string>>(new Set());
  const [savingWordKey, setSavingWordKey] = useState<string | null>(null);

  async function handleSaveWord(cacheKey: string, item: VocabularyItem) {
    if (savingWordKey || savedWordKeys.has(cacheKey)) return;

    setSavingWordKey(cacheKey);

    try {
      const { user } = await getCurrentUser();

      if (!user) return;

      await insertVocabulary({
        user_id: user.id,
        word: (item.texts[primaryLanguage] ?? "").trim(),
        translation: (item.texts[secondaryLanguage] ?? "").trim(),
        word_language: languagePair[0],
        translation_language: languagePair[1],
        part_of_speech: item.partOfSpeech?.trim() || null,
        example_sentence: item.examples[languagePair[0]]?.trim() || null,
        translated_example: item.examples[languagePair[1]]?.trim() || null,
        confidence: "medium",
        category: "other",
        status: "new",
      });

      setSavedWordKeys((current) => new Set(current).add(cacheKey));
    } catch (error) {
      console.error("Failed to save vocabulary word:", error);
    } finally {
      setSavingWordKey(null);
    }
  }

  useEffect(() => {
    if (!open || !card) return;

    let cancelled = false;

    card.vocabulary.forEach((item, index) => {
      const cacheKey = `${card.id}-${index}`;
      if (requestedKeysRef.current.has(cacheKey)) return;

      requestedKeysRef.current.add(cacheKey);

      void getPronunciation((item.texts[primaryLanguage] ?? ""), (item.texts[secondaryLanguage] ?? "")).then((result) => {
        if (cancelled || !result) return;

        setPronunciations((current) => ({
          ...current,
          [cacheKey]: result,
        }));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, card, primaryLanguage, secondaryLanguage]);

  return (
    <BottomSheet
      open={open && card !== null}
      onClose={onClose}
      title={copy.vocabularyDrawerTitle}
      description={copy.vocabularyDrawerDescription}
    >
      {card ? (
        <div className="space-y-5">
          {card.vocabulary.map((item, index) => {
            const baseKey = `drawer-${card.id}-${index}`;
            const wordKey = `${baseKey}-word`;
            const translationKey = `${baseKey}-translation`;
            const englishExampleKey = `${baseKey}-en-example`;
            const chineseExampleKey = `${baseKey}-zh-example`;
            const pronunciation = pronunciations[`${card.id}-${index}`];

            const wordBlock = (
              <div
                key="word"
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[17px] font-semibold text-black"
                    >
                      {(item.texts[primaryLanguage] ?? "")}
                    </span>

                    {(
                      <span className="text-[11px] text-ink-faint">
                        {partOfSpeechLabels[
                          normalizePartOfSpeech(item.partOfSpeech)
                        ]}
                      </span>
                    )}
                  </div>

                  {pronunciation?.englishPronunciation ? (
                    <p className="mt-0.5 text-[12px] text-ink-faint">
                      {pronunciation.englishPronunciation}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {(
                    <SaveWordButton
                      onClick={() => void handleSaveWord(wordKey, item)}
                      saving={savingWordKey === wordKey}
                      saved={savedWordKeys.has(wordKey)}
                      ariaLabel={
                        savedWordKeys.has(wordKey)
                          ? copy.addedToVocabulary
                          : copy.addToVocabularyAriaLabel.replace(
                              "{word}",
                              (item.texts[primaryLanguage] ?? "")
                            )
                      }
                    />
                  )}

                  <SpeakerButton
                    onClick={() =>
                      onSpeak(wordKey, (item.texts[primaryLanguage] ?? ""), getLanguage(primaryLanguage).speechTag)
                    }
                    active={speakingKey === wordKey}
                    ariaLabel={copy.readVocabWordAriaLabel.replace(
                      "{word}",
                      (item.texts[primaryLanguage] ?? "")
                    )}
                  />
                </div>
              </div>
            );

            const translationBlock = (
              <div
                key="translation"
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p
                      className="text-sm text-ink-soft"
                    >
                      {(item.texts[secondaryLanguage] ?? "")}
                    </p>


                  </div>

                  {pronunciation?.pinyin || pronunciation?.zhuyin ? (
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {[pronunciation?.pinyin, pronunciation?.zhuyin]
                        .filter(Boolean)
                        .join("  ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <SpeakerButton
                    onClick={() =>
                      onSpeak(
                        translationKey,
                        (item.texts[secondaryLanguage] ?? ""),
                        getLanguage(secondaryLanguage).speechTag
                      )
                    }
                    active={speakingKey === translationKey}
                    ariaLabel={copy.readVocabChineseAriaLabel.replace(
                      "{translation}",
                      (item.texts[secondaryLanguage] ?? "")
                    )}
                  />
                </div>
              </div>
            );

            const englishExampleBlock = (
              <div
                key="english-example"
                className="flex items-start gap-2"
              >
                <p className="min-w-0 flex-1 text-sm leading-6 text-ink-strong">
                  {(item.examples[primaryLanguage] ?? "")}
                </p>

                <SpeakerButton
                  onClick={() =>
                    onSpeak(
                      englishExampleKey,
                      (item.examples[primaryLanguage] ?? ""),
                      getLanguage(primaryLanguage).speechTag
                    )
                  }
                  active={speakingKey === englishExampleKey}
                  ariaLabel={copy.readEnglishAriaLabel}
                />
              </div>
            );

            const chineseExampleBlock = (
              <div
                key="chinese-example"
                className="flex items-start gap-2"
              >
                <p className="min-w-0 flex-1 text-sm leading-6 text-ink-soft">
                  {(item.examples[secondaryLanguage] ?? "")}
                </p>

                <SpeakerButton
                  onClick={() =>
                    onSpeak(
                      chineseExampleKey,
                      (item.examples[secondaryLanguage] ?? ""),
                      getLanguage(secondaryLanguage).speechTag
                    )
                  }
                  active={speakingKey === chineseExampleKey}
                  ariaLabel={copy.readChineseAriaLabel}
                />
              </div>
            );

            return (
              <div key={baseKey}>
                <div className="space-y-1">
                  {/* Pair order already: the word is the hero, the
                      translation the support. */}
                  {[wordBlock, translationBlock]}
                </div>

                <div className="mt-2.5 space-y-1">
                  {[englishExampleBlock, chineseExampleBlock]}
                </div>

                {index < card.vocabulary.length - 1 ? (
                  <div
                    className="mt-5"
                    style={{
                      borderTop: `1px solid ${DISCOVER_COLORS.divider}`,
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </BottomSheet>
  );
}
