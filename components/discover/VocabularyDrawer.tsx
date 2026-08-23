"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { getLanguage } from "@/lib/languages";
import type { SpeechLanguage } from "@/lib/speech";
import { useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle, Volume2 } from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
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
  const { pair } = useDisplayLanguages();


  const [primaryLanguage, secondaryLanguage] = pair;

  const partOfSpeechLabels = t.vocabulary.detail.partOfSpeech;

  const [savedWordKeys, setSavedWordKeys] = useState<Set<string>>(new Set());
  const [savingWordKey, setSavingWordKey] = useState<string | null>(null);

  async function handleSaveWord(cacheKey: string, item: VocabularyItem) {
    if (savingWordKey || savedWordKeys.has(cacheKey)) return;

    setSavingWordKey(cacheKey);

    try {
      const { user } = await getCurrentUser();

      if (!user) return;

      /*
       * Saved under the languages on screen, not the ones the reader
       * prefers. Where a card could not be shown in their pair, the two
       * differ — and filing a Spanish word as Italian because Italian is
       * what they are studying is worse than not saving it.
       */
      await insertVocabulary({
        user_id: user.id,
        word: (item.texts[primaryLanguage] ?? "").trim(),
        translation: (item.texts[secondaryLanguage] ?? "").trim(),
        word_language: primaryLanguage,
        translation_language: secondaryLanguage,
        part_of_speech: item.partOfSpeech?.trim() || null,
        example_sentence: item.examples[primaryLanguage]?.trim() || null,
        translated_example: item.examples[secondaryLanguage]?.trim() || null,
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

                  <PronunciationBlock
                    className="mt-0.5"
                    entries={[
                      {
                        text: item.texts[primaryLanguage],
                        language: primaryLanguage,
                      },
                    ]}
                  />
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

                  <PronunciationBlock
                    className="mt-0.5"
                    entries={[
                      {
                        text: item.texts[secondaryLanguage],
                        language: secondaryLanguage,
                      },
                    ]}
                  />
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
