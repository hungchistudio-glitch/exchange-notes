"use client";

import {
  Check,
  Clock3,
  FolderPlus,
  Pencil,
  Send,
  Share2,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useEffect } from "react";

import AppBadge from "@/components/ui/AppBadge";
import AppButton from "@/components/ui/AppButton";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { speak } from "@/lib/speech";
import { insertValues } from "@/lib/utils";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function SpeechRow({
  eyebrow,
  text,
  lang,
  size = "md",
  listenAriaLabel,
}: {
  eyebrow?: string;
  text: string;
  lang: "en-US" | "zh-TW";
  size?: "md" | "sm";
  listenAriaLabel: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left">
      <span className="min-w-0">
        {eyebrow && (
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-black/40">
            {eyebrow}
          </span>
        )}
        <span
          className={`mt-0.5 block break-words ${
            size === "md" ? "text-[15px] font-medium" : "text-sm"
          } text-black/85`}
        >
          {text}
        </span>
      </span>

      <button
        type="button"
        onClick={() => speak(text, lang)}
        aria-label={listenAriaLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black/60 shadow-sm transition active:scale-90"
      >
        <Volume2 size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

export default function VocabularyDetailSheet({
  item,
  open,
  updating,
  onClose,
  onChangeStatus,
  onSendToPartner,
  onShare,
  onDelete,
  onOpenCollections,
  onEdit,
}: {
  item: VocabularyItem;
  open: boolean;
  updating: boolean;
  onClose: () => void;
  onChangeStatus: (status: VocabularyStatus) => void;
  onSendToPartner: () => void;
  onShare: () => void;
  onDelete: () => void;
  onOpenCollections: () => void;
  onEdit: () => void;
}) {
  const { t, isTraditionalChinese } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();
  const detail = t.vocabulary.detail;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        type="button"
        aria-label={detail.closeDetailsAriaLabel}
        onClick={onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${item.word} details`}
        className="relative z-10 max-h-[90dvh] w-full max-w-[640px] overflow-y-auto rounded-t-[32px] bg-surface px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_60px_rgba(0,0,0,0.18)]"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" />

        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_36px_rgba(16,16,15,0.06)]">
          {item.image_url && (
            <div
              className="aspect-[16/10] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${item.image_url})` }}
              role="img"
              aria-label={item.word}
            />
          )}

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <AppBadge
                    tone={
                      item.status === "mastered"
                        ? "success"
                        : item.status === "learning"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {detail.levels[item.status]}
                  </AppBadge>
                  {item.part_of_speech && (
                    <AppBadge tone="neutral">
                      {detail.partOfSpeech[
                        normalizePartOfSpeech(item.part_of_speech)
                      ]}
                    </AppBadge>
                  )}
                </div>

                {isLearningChinese ? (
                  <>
                    <h2 className="mt-4 break-words text-[34px] font-semibold leading-none tracking-[-0.05em]">
                      {item.translation}
                    </h2>
                    <p className="mt-2 break-words text-[22px] font-normal leading-tight text-black/45">
                      {item.word}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-4 break-words text-[34px] font-semibold leading-none tracking-[-0.05em]">
                      {item.word}
                    </h2>
                    <p className="mt-2 break-words text-[22px] font-normal leading-tight text-black/45">
                      {item.translation}
                    </p>
                  </>
                )}

                <PronunciationBlock
                  english={item.word}
                  chinese={item.translation}
                  showEnglish
                  className="mt-3"
                />
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label={detail.editWordAriaLabel}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.055]"
                >
                  <Pencil size={17} strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label={detail.closeAriaLabel}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.055]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {isLearningChinese ? (
                <>
                  <SpeechRow
                    eyebrow="中文"
                    text={item.translation}
                    lang="zh-TW"
                    listenAriaLabel={insertValues(detail.listenAriaLabel, {
                      text: item.translation,
                    })}
                  />
                  <SpeechRow
                    eyebrow="English"
                    text={item.word}
                    lang="en-US"
                    listenAriaLabel={insertValues(detail.listenAriaLabel, {
                      text: item.word,
                    })}
                  />
                </>
              ) : (
                <>
                  <SpeechRow
                    eyebrow="English"
                    text={item.word}
                    lang="en-US"
                    listenAriaLabel={insertValues(detail.listenAriaLabel, {
                      text: item.word,
                    })}
                  />
                  <SpeechRow
                    eyebrow="中文"
                    text={item.translation}
                    lang="zh-TW"
                    listenAriaLabel={insertValues(detail.listenAriaLabel, {
                      text: item.translation,
                    })}
                  />
                </>
              )}
            </div>

            {(item.example_sentence || item.translated_example) && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                  {detail.example}
                </p>

                <div className="mt-2 space-y-2">
                  {isLearningChinese ? (
                    <>
                      {item.translated_example && (
                        <SpeechRow
                          text={item.translated_example}
                          lang="zh-TW"
                          size="sm"
                          listenAriaLabel={insertValues(
                            detail.listenAriaLabel,
                            { text: item.translated_example },
                          )}
                        />
                      )}

                      {item.example_sentence && (
                        <SpeechRow
                          text={item.example_sentence}
                          lang="en-US"
                          size="sm"
                          listenAriaLabel={insertValues(
                            detail.listenAriaLabel,
                            { text: item.example_sentence },
                          )}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {item.example_sentence && (
                        <SpeechRow
                          text={item.example_sentence}
                          lang="en-US"
                          size="sm"
                          listenAriaLabel={insertValues(
                            detail.listenAriaLabel,
                            { text: item.example_sentence },
                          )}
                        />
                      )}

                      {item.translated_example && (
                        <SpeechRow
                          text={item.translated_example}
                          lang="zh-TW"
                          size="sm"
                          listenAriaLabel={insertValues(
                            detail.listenAriaLabel,
                            { text: item.translated_example },
                          )}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                {detail.learningStatusLabel}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-[20px] bg-surface p-1.5">
                {(["new", "learning", "mastered"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={updating}
                    onClick={() => onChangeStatus(status)}
                    className={`min-h-[44px] rounded-[15px] px-2 text-[12px] font-semibold transition-all disabled:opacity-40 ${
                      item.status === status
                        ? "bg-black text-white shadow-sm"
                        : "text-black/45"
                    }`}
                  >
                    {detail.levels[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] text-black/45">
              <div className="flex items-center gap-2 rounded-[18px] bg-black/[0.035] p-3">
                <Clock3 size={15} />
                <span>
                  {insertValues(detail.addedLabel, {
                    date: formatDate(
                      item.created_at,
                      isTraditionalChinese ? "zh-TW" : "en-US",
                    ),
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-[18px] bg-black/[0.035] p-3">
                <Check size={15} />
                <span>
                  {insertValues(detail.confidenceLabel, {
                    confidence:
                      item.confidence === "high"
                        ? detail.confidenceHigh
                        : item.confidence === "low"
                          ? detail.confidenceLow
                          : detail.confidenceMedium,
                  })}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              <AppButton
                variant="secondary"
                size="icon"
                className="h-12 w-full"
                onClick={onOpenCollections}
                aria-label={detail.addToCollectionsAriaLabel}
              >
                <FolderPlus size={18} />
              </AppButton>

              <AppButton
                size="icon"
                className="h-12 w-full"
                onClick={onSendToPartner}
                aria-label={detail.sendToFriendAriaLabel}
              >
                <Send size={18} />
              </AppButton>

              <AppButton
                variant="secondary"
                size="icon"
                className="h-12 w-full"
                onClick={onShare}
                aria-label={detail.shareWordAriaLabel}
              >
                <Share2 size={18} />
              </AppButton>

              <AppButton
                variant="danger"
                size="icon"
                className="h-12 w-full"
                onClick={onDelete}
                aria-label={detail.deleteWordAriaLabel}
              >
                <Trash2 size={18} />
              </AppButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
