"use client";

import type { SpeechLanguage } from "@/lib/speech";
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
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";

import AppBadge from "@/components/ui/AppBadge";
import AppButton from "@/components/ui/AppButton";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import { getLanguage } from "@/lib/languages";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
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
  lang: SpeechLanguage;
  size?: "md" | "sm";
  listenAriaLabel: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left">
      <span className="min-w-0">
        {eyebrow && (
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            {eyebrow}
          </span>
        )}
        <span
          className={`mt-0.5 block break-words ${
            size === "md" ? "text-[15px] font-medium" : "text-sm"
          } text-black`}
        >
          {text}
        </span>
      </span>

      <button
        type="button"
        onClick={() => speak(text, lang)}
        aria-label={listenAriaLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-soft shadow-sm transition active:scale-90"
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
  const { learningLanguage } = useLearningLanguageContext();
  const sides = getVocabularyCardSides(item, learningLanguage);
  const detail = t.vocabulary.detail;
  const motion = useSheetMotion({ open, onClose });

  if (!motion.rendered) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        type="button"
        aria-label={detail.closeDetailsAriaLabel}
        onClick={motion.requestClose}
        className={`absolute inset-0 bg-black/35 backdrop-blur-[2px] ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${item.word} details`}
        {...motion.panelProps}
        className={`${motion.panelClassName} relative z-10 max-h-[90dvh] w-full max-w-[640px] overflow-y-auto rounded-t-[32px] bg-surface px-4 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(0,0,0,0.18)]`}
      >
        <div
          className={`${motion.handleClassName} -mx-4 flex h-9 items-center justify-center`}
          {...motion.handleProps}
        >
          <span className="h-1.5 w-12 rounded-full bg-black/15" />
        </div>

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

                <h2 className="mt-4 break-words text-[34px] font-semibold leading-none tracking-[-0.05em]">
                  {sides.primary.text}
                </h2>
                <p className="mt-2 break-words text-[22px] font-normal leading-tight text-ink-soft">
                  {sides.secondary.text}
                </p>

                <PronunciationBlock
                  entries={[
                    { text: sides.primary.text, language: sides.primary.language },
                    {
                      text: sides.secondary.text,
                      language: sides.secondary.language,
                    },
                  ]}
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
                  onClick={motion.requestClose}
                  aria-label={detail.closeAriaLabel}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.055]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {[sides.primary, sides.secondary].map((side) => (
                <SpeechRow
                  key={side.language}
                  eyebrow={getLanguage(side.language).endonym}
                  text={side.text}
                  lang={getLanguage(side.language).speechTag}
                  listenAriaLabel={insertValues(detail.listenAriaLabel, {
                    text: side.text,
                  })}
                />
              ))}
            </div>

            {(item.example_sentence || item.translated_example) && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                  {detail.example}
                </p>

                <div className="mt-2 space-y-2">
                  {[sides.primary, sides.secondary].map((side) =>
                    side.example ? (
                      <SpeechRow
                        key={`example-${side.language}`}
                        text={side.example}
                        lang={getLanguage(side.language).speechTag}
                        size="sm"
                        listenAriaLabel={insertValues(detail.listenAriaLabel, {
                          text: side.example,
                        })}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
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
                        : "text-ink-soft"
                    }`}
                  >
                    {detail.levels[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] text-ink-soft">
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
