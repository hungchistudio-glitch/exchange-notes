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
import { speak } from "@/lib/speech";
import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
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
}: {
  eyebrow?: string;
  text: string;
  lang: "en-US" | "zh-TW";
  size?: "md" | "sm";
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
        aria-label={`Listen: ${text}`}
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
        aria-label="Close word details"
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
                    {STATUS_LABELS[item.status]}
                  </AppBadge>
                  {item.part_of_speech && (
                    <AppBadge tone="neutral">{item.part_of_speech}</AppBadge>
                  )}
                </div>

                <h2 className="mt-4 break-words text-[34px] font-semibold leading-none tracking-[-0.05em]">
                  {item.word}
                </h2>
                <p className="mt-2 break-words text-[22px] leading-tight text-black/58">
                  {item.translation}
                </p>

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
                  aria-label="Edit word"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.055]"
                >
                  <Pencil size={17} strokeWidth={1.8} />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.055]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <SpeechRow eyebrow="English" text={item.word} lang="en-US" />
              <SpeechRow eyebrow="中文" text={item.translation} lang="zh-TW" />
            </div>

            {(item.example_sentence || item.translated_example) && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                  Example
                </p>

                <div className="mt-2 space-y-2">
                  {item.example_sentence && (
                    <SpeechRow
                      text={item.example_sentence}
                      lang="en-US"
                      size="sm"
                    />
                  )}

                  {item.translated_example && (
                    <SpeechRow
                      text={item.translated_example}
                      lang="zh-TW"
                      size="sm"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                Learning status
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
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] text-black/45">
              <div className="flex items-center gap-2 rounded-[18px] bg-black/[0.035] p-3">
                <Clock3 size={15} />
                <span>Added {formatDate(item.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-[18px] bg-black/[0.035] p-3">
                <Check size={15} />
                <span>{item.confidence ?? "medium"} confidence</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              <AppButton
                variant="secondary"
                size="icon"
                className="h-12 w-full"
                onClick={onOpenCollections}
                aria-label="Add to collections"
              >
                <FolderPlus size={18} />
              </AppButton>

              <AppButton
                size="icon"
                className="h-12 w-full"
                onClick={onSendToPartner}
                aria-label="Send to a friend"
              >
                <Send size={18} />
              </AppButton>

              <AppButton
                variant="secondary"
                size="icon"
                className="h-12 w-full"
                onClick={onShare}
                aria-label="Share word"
              >
                <Share2 size={18} />
              </AppButton>

              <AppButton
                variant="danger"
                size="icon"
                className="h-12 w-full"
                onClick={onDelete}
                aria-label="Delete word"
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
