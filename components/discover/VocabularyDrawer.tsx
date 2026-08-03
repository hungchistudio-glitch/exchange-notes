"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle, Volume2 } from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import { getPronunciation, type PronunciationResult } from "@/lib/pronunciation/getPronunciation";
import { getCurrentUser, insertVocabulary } from "@/lib/vocabulary/repository";
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
    language: "en-US" | "zh-TW"
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/60 transition-transform active:scale-90"
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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 disabled:active:scale-100 ${
        saved
          ? "bg-emerald-50 text-emerald-700"
          : "bg-black/[0.04] text-black/60"
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
        word: item.word.trim(),
        translation: item.translation.trim(),
        language: "english",
        part_of_speech: item.partOfSpeech?.trim() || null,
        example_sentence: item.englishExample?.trim() || null,
        translated_example: item.chineseExample?.trim() || null,
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

      void getPronunciation(item.word, item.translation).then((result) => {
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
  }, [open, card]);

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

            return (
              <div key={baseKey}>
                {/* English word */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[17px] font-semibold text-black">
                        {item.word}
                      </span>

                      <span className="text-[11px] text-black/40">
                        {item.partOfSpeech}
                      </span>
                    </div>

                    {pronunciation?.englishPronunciation ? (
                      <p className="mt-0.5 text-[12px] text-black/40">
                        {pronunciation.englishPronunciation}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <SaveWordButton
                      onClick={() => void handleSaveWord(wordKey, item)}
                      saving={savingWordKey === wordKey}
                      saved={savedWordKeys.has(wordKey)}
                      ariaLabel={
                        savedWordKeys.has(wordKey)
                          ? copy.addedToVocabulary
                          : copy.addToVocabularyAriaLabel.replace(
                              "{word}",
                              item.word
                            )
                      }
                    />

                    <SpeakerButton
                      onClick={() =>
                        onSpeak(wordKey, item.word, "en-US")
                      }
                      active={speakingKey === wordKey}
                      ariaLabel={copy.readVocabWordAriaLabel.replace(
                        "{word}",
                        item.word
                      )}
                    />
                  </div>
                </div>

                {/* Chinese translation */}
                <div className="mt-1 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-black/50">
                      {item.translation}
                    </p>

                    {pronunciation?.pinyin || pronunciation?.zhuyin ? (
                      <p className="mt-0.5 text-[11px] text-black/35">
                        {[pronunciation?.pinyin, pronunciation?.zhuyin]
                          .filter(Boolean)
                          .join("  ")}
                      </p>
                    ) : null}
                  </div>

                  <SpeakerButton
                    onClick={() =>
                      onSpeak(
                        translationKey,
                        item.translation,
                        "zh-TW"
                      )
                    }
                    active={speakingKey === translationKey}
                    ariaLabel={copy.readVocabChineseAriaLabel.replace(
                      "{translation}",
                      item.translation
                    )}
                  />
                </div>

                {/* English example sentence */}
                <div className="mt-2.5 flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm leading-6 text-black/70">
                    {item.englishExample}
                  </p>

                  <SpeakerButton
                    onClick={() =>
                      onSpeak(
                        englishExampleKey,
                        item.englishExample,
                        "en-US"
                      )
                    }
                    active={speakingKey === englishExampleKey}
                    ariaLabel={copy.readEnglishAriaLabel}
                  />
                </div>

                {/* Chinese example sentence */}
                <div className="mt-1 flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-sm leading-6 text-black/45">
                    {item.chineseExample}
                  </p>

                  <SpeakerButton
                    onClick={() =>
                      onSpeak(
                        chineseExampleKey,
                        item.chineseExample,
                        "zh-TW"
                      )
                    }
                    active={speakingKey === chineseExampleKey}
                    ariaLabel={copy.readChineseAriaLabel}
                  />
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
