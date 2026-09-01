"use client";

import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { getLanguage } from "@/lib/languages";
import type { SpeechLanguage } from "@/lib/speech";
import { useState } from "react";
import {
  Check,
  ChevronRight,
  EyeOff,
  ExternalLink,
  LoaderCircle,
  MoreHorizontal,
  NotebookPen,
  Send,
  Share2,
  Sparkles,
  Volume2,
} from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import type { TranslationDictionary } from "@/lib/i18n/types";

import { DISCOVER_COLORS, type DailyNewsCard } from "./types";

type StoryDetailSheetProps = {
  card: DailyNewsCard | null;
  open: boolean;
  onClose: () => void;
  copy: TranslationDictionary["discover"];
  isSaved: boolean;
  isSaving: boolean;
  speakingKey: string | null;
  categoryText: string;
  formattedTime: string;
  onSpeak: (
    key: string,
    text: string,
    language: SpeechLanguage
  ) => void;
  onSave: () => void;
  onSend: () => void;
  onOpenVocabulary: () => void;
  onOpenSource: () => void;
  onShare: () => void;
  onHide: () => void;
};

export default function StoryDetailSheet({
  card,
  open,
  onClose,
  copy,
  isSaved,
  isSaving,
  speakingKey,
  categoryText,
  formattedTime,
  onSpeak,
  onSave,
  onSend,
  onOpenVocabulary,
  onOpenSource,
  onShare,
  onHide,
}: StoryDetailSheetProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Above the early return: a hook cannot be called conditionally.
  const { pair } = useDisplayLanguages();
  /*
   * The two languages the reader chose, and only those. A card that cannot
   * lead in the language being learned is filtered out upstream rather than
   * shown in a language nobody asked for.
   */
  const [primaryLanguage, secondaryLanguage] = pair;

  if (!card) {
    return (
      <BottomSheet open={false} onClose={onClose} title="">
        <div />
      </BottomSheet>
    );
  }

  const titleEnKey = `detail-title-en-${card.id}`;
  const titleZhKey = `detail-title-zh-${card.id}`;
  const summaryEnKey = `detail-summary-en-${card.id}`;
  const summaryZhKey = `detail-summary-zh-${card.id}`;

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setMenuOpen(false);
        onClose();
      }}
      title={categoryText}
      description={formattedTime}
      footer={
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isSaved}
            aria-label={
              isSaving ? copy.saving : isSaved ? copy.saved : copy.saveToNotes
            }
            title={
              isSaving ? copy.saving : isSaved ? copy.saved : copy.saveToNotes
            }
            className={`flex h-11 flex-1 items-center justify-center rounded-2xl transition-transform active:scale-[0.98] disabled:opacity-70 ${
              isSaved
                ? "bg-emerald-50 text-emerald-700"
                : "text-white"
            }`}
            style={
              isSaved
                ? undefined
                : { backgroundColor: DISCOVER_COLORS.accent }
            }
          >
            {isSaving ? (
              <LoaderCircle
                size={17}
                strokeWidth={1.8}
                className="animate-spin"
              />
            ) : isSaved ? (
              <Check size={17} strokeWidth={1.8} />
            ) : (
              <NotebookPen size={17} strokeWidth={1.8} />
            )}
          </button>

          <button
            type="button"
            onClick={onSend}
            aria-label={copy.sendToPartner}
            title={copy.sendToPartner}
            className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-black/[0.08] bg-white text-black transition-transform active:scale-[0.98]"
          >
            <Send size={17} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={copy.moreActionsAriaLabel}
            title={copy.moreActionsAriaLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/[0.08] bg-white text-black transition-transform active:scale-95"
          >
            <MoreHorizontal size={18} strokeWidth={1.8} />
          </button>

          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />

              <div className="absolute bottom-[calc(100%+8px)] right-0 z-20 w-52 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]">
                <button
                  type="button"
                  disabled
                  title={copy.quizSoonTitle}
                  className="flex w-full cursor-not-allowed items-center gap-2.5 px-4 py-3 text-left text-[0.8125rem] font-medium text-ink-faint"
                >
                  <Sparkles size={15} strokeWidth={1.8} />
                  {copy.quizSoon}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSource();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[0.8125rem] font-medium text-black transition hover:bg-black/[0.03]"
                >
                  <ExternalLink size={15} strokeWidth={1.8} />
                  {copy.openSource}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onShare();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[0.8125rem] font-medium text-black transition hover:bg-black/[0.03]"
                >
                  <Share2 size={15} strokeWidth={1.8} />
                  {copy.shareStory}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onHide();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[0.8125rem] font-medium text-red-600 transition hover:bg-red-50"
                >
                  <EyeOff size={15} strokeWidth={1.8} />
                  {copy.hideStory}
                </button>
              </div>
            </>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-[1.3125rem] font-bold leading-[1.25] tracking-[-0.02em] text-black">
              {(card.titles[primaryLanguage] ?? "")}
            </h3>

            <button
              type="button"
              onClick={() =>
                onSpeak(titleEnKey, (card.titles[primaryLanguage] ?? ""), getLanguage(primaryLanguage).speechTag)
              }
              aria-label={copy.readEnglishAriaLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft transition-transform active:scale-90"
            >
              <Volume2
                size={15}
                strokeWidth={1.8}
                className={speakingKey === titleEnKey ? "animate-pulse" : ""}
              />
            </button>
          </div>

          <div className="mt-2 flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[0.9375rem] font-medium leading-[1.6] text-ink-soft">
              {(card.titles[secondaryLanguage] ?? "")}
            </p>

            <button
              type="button"
              onClick={() =>
                onSpeak(titleZhKey, (card.titles[secondaryLanguage] ?? ""), getLanguage(secondaryLanguage).speechTag)
              }
              aria-label={copy.readChineseAriaLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft transition-transform active:scale-90"
            >
              <Volume2
                size={15}
                strokeWidth={1.8}
                className={speakingKey === titleZhKey ? "animate-pulse" : ""}
              />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[0.9375rem] leading-[1.7] text-ink-strong">
              {(card.summaries[primaryLanguage] ?? "")}
            </p>

            <button
              type="button"
              onClick={() =>
                onSpeak(summaryEnKey, (card.summaries[primaryLanguage] ?? ""), getLanguage(primaryLanguage).speechTag)
              }
              aria-label={copy.readEnglishAriaLabel}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft transition-transform active:scale-90"
            >
              <Volume2
                size={14}
                strokeWidth={1.8}
                className={
                  speakingKey === summaryEnKey ? "animate-pulse" : ""
                }
              />
            </button>
          </div>

          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[0.875rem] leading-[1.7] text-ink-soft">
              {(card.summaries[secondaryLanguage] ?? "")}
            </p>

            <button
              type="button"
              onClick={() =>
                onSpeak(summaryZhKey, (card.summaries[secondaryLanguage] ?? ""), getLanguage(secondaryLanguage).speechTag)
              }
              aria-label={copy.readChineseAriaLabel}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft transition-transform active:scale-90"
            >
              <Volume2
                size={14}
                strokeWidth={1.8}
                className={
                  speakingKey === summaryZhKey ? "animate-pulse" : ""
                }
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenVocabulary}
          className="flex w-full items-center justify-between rounded-2xl bg-black/[0.035] px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <span className="min-w-0 truncate text-[0.8125rem] font-medium text-ink-strong">
            {copy.keyWordsLabel.replace(
              "{count}",
              String(card.vocabulary.length)
            )}
            {card.vocabulary.length > 0 ? (
              <span className="text-ink-faint">
                {" · "}
                {card.vocabulary
                  .map((item) => (item.texts[primaryLanguage] ?? ""))
                  .join(" · ")}
              </span>
            ) : null}
          </span>

          <ChevronRight
            size={16}
            strokeWidth={1.8}
            className="shrink-0 text-ink-faint"
          />
        </button>
      </div>
    </BottomSheet>
  );
}
