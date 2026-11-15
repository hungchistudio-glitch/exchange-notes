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
} from "lucide-react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import { SpeakKey, SpokenText, WordByWordSwitch } from "@/components/speech/Spoken";
import useTranslation from "@/hooks/i18n/useTranslation";
import { plural } from "@/lib/i18n/format";
import type { TranslationDictionary } from "@/lib/i18n/types";

import { DISCOVER_COLORS, type DailyNewsCard } from "./types";

type StoryDetailSheetProps = {
  card: DailyNewsCard | null;
  open: boolean;
  onClose: () => void;
  copy: TranslationDictionary["discover"];
  isSaved: boolean;
  isSaving: boolean;
  categoryText: string;
  formattedTime: string;
  /** The news's own pace (its Slow/Natural/Fast), per language. */
  speechRate: (language: SpeechLanguage) => number;
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
  categoryText,
  formattedTime,
  speechRate,
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
  const { t, locale } = useTranslation();
  /*
   * The two languages the reader chose, and only those. A card that cannot
   * lead in the language being learned is filtered out upstream rather than
   * shown in a language nobody asked for.
   */
  const [primaryLanguage, secondaryLanguage] = pair;

  /*
   * Only before the first story is ever opened. The empty shell that used to
   * stand here existed so the sheet stayed mounted long enough to animate
   * out after its card was cleared — which it did, as a blank panel. The
   * card is now held by the caller for exactly as long as the exit takes.
   */
  if (!card) return null;

  const primarySpeech = getLanguage(primaryLanguage).speechTag;
  const secondarySpeech = getLanguage(secondaryLanguage).speechTag;
  const titleKey = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft transition-transform active:scale-90";
  const summaryKey = "hit-44 relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-ink-soft transition-transform active:scale-90";

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
                aria-label={t.common.close}
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
      {/*
        Each line lights the word being said, and a tapped word reads on
        from there (Chi, 2026-11-14). The story's full play on the featured
        card lights these same lines, and follows them down the sheet.
      */}
      <div className="space-y-5">
        <div>
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-[1.3125rem] font-bold leading-[1.25] tracking-[-0.02em] text-black">
              <SpokenText text={card.titles[primaryLanguage] ?? ""} lang={primarySpeech} tapToStart />
            </h3>

            <SpeakKey
              text={card.titles[primaryLanguage] ?? ""}
              lang={primarySpeech}
              rate={speechRate}
              label={copy.readEnglishAriaLabel}
              iconSize={13}
              className={titleKey}
            />
          </div>

          <div className="mt-2 flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[0.9375rem] font-medium leading-[1.6] text-ink-soft">
              <SpokenText text={card.titles[secondaryLanguage] ?? ""} lang={secondarySpeech} tapToStart />
            </p>

            <SpeakKey
              text={card.titles[secondaryLanguage] ?? ""}
              lang={secondarySpeech}
              rate={speechRate}
              label={copy.readChineseAriaLabel}
              iconSize={13}
              className={titleKey}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-end">
            <WordByWordSwitch />
          </div>

          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[0.9375rem] leading-[1.7] text-ink-strong">
              <SpokenText text={card.summaries[primaryLanguage] ?? ""} lang={primarySpeech} tapToStart />
            </p>

            <SpeakKey
              text={card.summaries[primaryLanguage] ?? ""}
              lang={primarySpeech}
              rate={speechRate}
              label={copy.readEnglishAriaLabel}
              iconSize={12}
              className={summaryKey}
            />
          </div>

          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[0.875rem] leading-[1.7] text-ink-soft">
              <SpokenText text={card.summaries[secondaryLanguage] ?? ""} lang={secondarySpeech} tapToStart />
            </p>

            <SpeakKey
              text={card.summaries[secondaryLanguage] ?? ""}
              lang={secondarySpeech}
              rate={speechRate}
              label={copy.readChineseAriaLabel}
              iconSize={12}
              className={summaryKey}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenVocabulary}
          className="flex w-full items-center justify-between rounded-2xl bg-black/[0.035] px-4 py-3.5 text-left transition active:scale-[0.99]"
        >
          <span className="min-w-0 truncate text-[0.8125rem] font-medium text-ink-strong">
            {plural(
              card.vocabulary.length,
              locale,
              copy.keyWordsLabelOne,
              copy.keyWordsLabel
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
