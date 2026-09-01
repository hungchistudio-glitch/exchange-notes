"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { getLanguage } from "@/lib/languages";
import type { SpeechLanguage } from "@/lib/speech";
import { useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle, Volume2 } from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getCurrentUser } from "@/lib/vocabulary/repository";
import {
  DuplicateVocabularyError,
  createVocabularyEntry,
} from "@/lib/vocabulary/createEntry";
import { findDuplicate } from "@/lib/lexicon/personal";
import useVocabulary from "@/hooks/useVocabulary";
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
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  /*
   * The reader's own words, so a recommendation they already have is shown
   * as already theirs rather than as something to tap.
   *
   * Seventeen percent of a week's recommendations are already in this
   * library, and the proportion only grows. Every one of them used to offer
   * a save button that threw DuplicateVocabularyError into a console nobody
   * was reading: the button did not move, no message appeared, and the
   * feature looked broken at exactly the moment it was working correctly.
   */
  const { items } = useVocabulary();

  async function handleSaveWord(cacheKey: string, item: VocabularyItem) {
    if (savingWordKey || savedWordKeys.has(cacheKey)) return;

    setSavingWordKey(cacheKey);
    setSaveErrors((current) => {
      if (!(cacheKey in current)) return current;
      const next = { ...current };
      delete next[cacheKey];
      return next;
    });

    try {
      const { user } = await getCurrentUser();

      if (!user) {
        // Was a bare `return`, which left the reader tapping a button that
        // did nothing and said nothing.
        setSaveErrors((current) => ({
          ...current,
          [cacheKey]: copy.saveWordLoginError,
        }));
        return;
      }

      /*
       * Saved under the languages on screen, not the ones the reader
       * prefers. Where a card could not be shown in their pair, the two
       * differ — and filing a Spanish word as Italian because Italian is
       * what they are studying is worse than not saving it.
       */
      await createVocabularyEntry({
        userId: user.id,
        term: item.texts[primaryLanguage] ?? "",
        translation: item.texts[secondaryLanguage] ?? "",
        partOfSpeech: item.partOfSpeech,
        termExample: item.examples[primaryLanguage],
        translationExample: item.examples[secondaryLanguage],
        confidence: "medium",
        category: "other",
        status: "new",
        language: {
          pair: [primaryLanguage, secondaryLanguage],
          stated: { term: primaryLanguage, translation: secondaryLanguage },
        },
      });

      setSavedWordKeys((current) => new Set(current).add(cacheKey));
    } catch (error) {
      console.error("Failed to save vocabulary word:", error);

      /*
       * A duplicate is not a failure. The word is in the library, which is
       * what the reader wanted, so the button settles into the same state it
       * would have reached by saving — the only case that can reach here now
       * is a word saved somewhere else while this sheet was open, because
       * the ones already in the library never offered a button.
       */
      if (error instanceof DuplicateVocabularyError) {
        setSavedWordKeys((current) => new Set(current).add(cacheKey));
        return;
      }

      setSaveErrors((current) => ({
        ...current,
        [cacheKey]: copy.saveWordError,
      }));
    } finally {
      setSavingWordKey(null);
    }
  }

  /** Whether this word is already one of the reader's, under its own language. */
  function alreadyInLibrary(item: VocabularyItem) {
    return Boolean(
      findDuplicate(items, item.texts[primaryLanguage] ?? "", primaryLanguage),
    );
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

            const owned = alreadyInLibrary(item);
            /*
             * Already theirs, or saved in this sitting. Either way the button
             * is a tick rather than an invitation — the reader can see at a
             * glance which of the three are new to them.
             */
            const saved = owned || savedWordKeys.has(wordKey);
            const saveError = saveErrors[wordKey];
            const word = item.texts[primaryLanguage] ?? "";

            const wordBlock = (
              <div
                key="word"
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[1.0625rem] font-semibold text-black"
                    >
                      {word}
                    </span>

                    {(
                      <span className="text-[0.6875rem] text-ink-faint">
                        {partOfSpeechLabels[
                          normalizePartOfSpeech(item.partOfSpeech)
                        ]}
                      </span>
                    )}
                  </div>

                  {owned && (
                    <p className="mt-0.5 text-[0.6875rem] text-ink-faint">
                      {copy.wordAlreadySaved}
                    </p>
                  )}

                  {saveError && (
                    <p
                      role="status"
                      className="mt-1 text-[0.6875rem] leading-4 text-[var(--accent-amber-deep)]"
                    >
                      {saveError}
                    </p>
                  )}

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
                      saved={saved}
                      ariaLabel={
                        owned
                          ? copy.wordAlreadySavedAriaLabel.replace(
                              "{word}",
                              word,
                            )
                          : saved
                            ? copy.addedToVocabulary
                            : copy.addToVocabularyAriaLabel.replace(
                                "{word}",
                                word,
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
