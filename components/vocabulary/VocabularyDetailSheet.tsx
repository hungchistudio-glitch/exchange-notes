"use client";

import {
  BookOpen,
  FolderPlus,
  Check,
  Clock3,
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
        className="relative z-10 max-h-[90dvh] w-full max-w-[640px] overflow-y-auto rounded-t-[32px] bg-[#f4f1ea] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_60px_rgba(0,0,0,0.18)]"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" />

        <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_36px_rgba(16,16,15,0.06)]">
          {item.image_url ? (
            <div
              className="aspect-[16/10] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${item.image_url})` }}
              role="img"
              aria-label={item.word}
            />
          ) : (
            <div className="flex aspect-[16/7] items-center justify-center bg-[#ebe7de]">
              <BookOpen
                size={34}
                strokeWidth={1.45}
                className="text-black/35"
              />
            </div>
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

              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.055]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <AppButton
                variant="secondary"
                size="md"
                onClick={() => speak(item.word, "en-US")}
              >
                <Volume2 size={16} />
                English
              </AppButton>
              <AppButton
                variant="secondary"
                size="md"
                onClick={() => speak(item.translation, "zh-TW")}
              >
                <Volume2 size={16} />
                中文
              </AppButton>
            </div>

            {(item.example_sentence || item.translated_example) && (
              <div className="mt-5 rounded-[22px] bg-[#f5f2eb] p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                  Example
                </p>
                {item.example_sentence && (
                  <p className="mt-3 text-[15px] leading-6 text-black/82">
                    {item.example_sentence}
                  </p>
                )}
                {item.translated_example && (
                  <p className="mt-2 text-[14px] leading-6 text-black/48">
                    {item.translated_example}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                Learning status
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-[20px] bg-[#f5f2eb] p-1.5">
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

            <AppButton
              variant="secondary"
              size="lg"
              className="mt-5 w-full"
              onClick={onOpenCollections}
            >
              <FolderPlus size={16} />
              Add to collections
            </AppButton>

            <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
              <AppButton size="lg" onClick={onSendToPartner}>
                <Send size={16} />
                Send
              </AppButton>
              <AppButton
                variant="secondary"
                size="icon"
                onClick={onShare}
                aria-label="Share word"
              >
                <Share2 size={17} />
              </AppButton>
              <AppButton
                variant="danger"
                size="icon"
                onClick={onDelete}
                aria-label="Delete word"
              >
                <Trash2 size={17} />
              </AppButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
