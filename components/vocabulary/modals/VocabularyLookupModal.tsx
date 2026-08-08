"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import { speak } from "@/lib/speech";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { insertValues } from "@/lib/utils";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import type {
  VocabularyLookupResult,
  VocabularyLookupStatus,
} from "@/lib/types/vocabularyLookup";
import {
  BookmarkPlus,
  Check,
  LoaderCircle,
  Search,
  Send,
  Share,
  Volume2,
  X,
  Zap,
} from "lucide-react";



export type VocabularyLookupModalProps = {
  open: boolean;
  onClose: () => void;

  query: string;
  setQuery: (value: string) => void;

  lookupStatus: VocabularyLookupStatus;
  lookupResult: VocabularyLookupResult | null;
  lookupError: string;
  lookupDegraded?: boolean;

  savingLookup: boolean;
  lookupCopied: boolean;

  onLookupWord: () => void;
  onSave: () => void;
  onShare: () => void;
  onSend: () => void;
};

export default function VocabularyLookupModal({
  open,
  onClose,
  query,
  setQuery,
  lookupStatus,
  lookupResult,
  lookupError,
  lookupDegraded = false,
  savingLookup,
  lookupCopied,
  onLookupWord,
  onSave,
  onShare,
  onSend,
}: VocabularyLookupModalProps) {
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();
  const motion = useSheetMotion({ open, onClose });

  if (!motion.rendered) return null;

  function resetSearchState() {
    setQuery("");
  }

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label={t.vocabulary.lookup.closeSearchAriaLabel}
        onClick={motion.requestClose}
        className={`absolute inset-0 bg-black/25 backdrop-blur-[3px] ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-search-title"
        {...motion.panelProps}
        className={`${motion.panelClassName} relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]`}
        style={{
          ...motion.panelProps.style,
          paddingBottom: "max(env(safe-area-inset-bottom), 18px)",
        }}
      >
        <div
          className={`${motion.handleClassName} flex h-8 shrink-0 items-center justify-center sm:hidden`}
          {...motion.handleProps}
        >
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex items-center justify-between border-b border-black/10 px-5 pb-4 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              {t.vocabulary.lookup.search}
            </p>

            <h2
              id="ai-search-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em]"
            >
              {t.vocabulary.lookup.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={motion.requestClose}
            aria-label={t.vocabulary.lookup.closeSearchAriaLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onLookupWord();
            }}
          >
            <div className="flex h-12 items-center gap-3 rounded-full border border-black/10 bg-surface px-4">
              <Search
                size={17}
                strokeWidth={2}
                className="shrink-0 text-neutral-500"
              />

              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.vocabulary.lookup.inputPlaceholder}
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
              />

              {query && (
                <button
                  type="button"
                  onClick={resetSearchState}
                  aria-label={t.vocabulary.lookup.clearSearchAriaLabel}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!query.trim() || lookupStatus === "loading"}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-[13px] font-semibold text-white disabled:opacity-30"
            >
              {lookupStatus === "loading" ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  {t.vocabulary.lookup.searching}
                </>
              ) : (
                <>
                  <Search size={15} />
                  {t.vocabulary.lookup.search}
                </>
              )}
            </button>
          </form>

          {lookupStatus === "idle" && (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                <Zap size={21} strokeWidth={1.8} />
              </div>

              <p className="mx-auto mt-4 max-w-xs text-[13px] leading-6 text-neutral-500">
                {t.vocabulary.lookup.description}
              </p>
            </div>
          )}

          {lookupStatus === "error" && (
            <div className="mt-5 rounded-[20px] bg-red-50 p-4">
              <p className="text-[13px] leading-5 text-red-700">
                {lookupError || t.vocabulary.lookup.error}
              </p>
            </div>
          )}

          {lookupStatus === "result" && lookupDegraded && (
            <div className="mt-5 rounded-[20px] border border-[#c9962e]/20 bg-[#c9962e]/[0.07] p-4">
              <p className="text-[13px] leading-5 text-[#6b4e1f]">
                {t.vocabulary.lookup.degradedNotice}
              </p>

              <button
                type="button"
                onClick={onLookupWord}
                className="mt-2 text-[13px] font-semibold text-[#6b4e1f] underline underline-offset-2"
              >
                {t.vocabulary.lookup.degradedRetry}
              </button>
            </div>
          )}

          {lookupStatus === "result" && lookupResult && (
            <article className="mt-5 overflow-hidden rounded-[26px] border border-black/[0.08] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
              <div className="p-5 sm:p-6">
                <div className="space-y-6">
                  {(() => {
                    const englishSection = (
                      <section key="english">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                          {t.vocabulary.lookup.english}
                        </p>

                        <div className="mt-2 flex items-center gap-3">
                          <p
                            className={
                              isLearningChinese
                                ? "min-w-0 flex-1 break-words text-[20px] font-normal tracking-[-0.02em] text-black/45"
                                : "min-w-0 flex-1 break-words text-[28px] font-semibold tracking-[-0.035em] text-black"
                            }
                          >
                            {lookupResult.englishName}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.englishName, "en-US")
                            }
                            aria-label={t.vocabulary.lookup.english}
                            title={t.vocabulary.lookup.english}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface transition-transform active:scale-95"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>

                        {!isLearningChinese && (
                          <div className="mt-3 rounded-[18px] bg-surface px-4 py-3">
                            <PronunciationBlock
                              english={lookupResult.englishName}
                              chinese={lookupResult.chineseName}
                            />

                            <p className="mt-2 text-[11px] tracking-[0.04em] text-neutral-400">
                              {t.vocabulary.detail.partOfSpeech[
                                normalizePartOfSpeech(
                                  lookupResult.partOfSpeech,
                                )
                              ]}
                            </p>
                          </div>
                        )}
                      </section>
                    );

                    const chineseSection = (
                      <section key="chinese">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                          {t.vocabulary.lookup.chinese}
                        </p>

                        <div className="mt-2 flex items-center gap-3">
                          <p
                            className={
                              isLearningChinese
                                ? "min-w-0 flex-1 break-words text-[28px] font-semibold tracking-[-0.035em] text-black"
                                : "min-w-0 flex-1 break-words text-[20px] font-normal tracking-[-0.02em] text-black/45"
                            }
                          >
                            {lookupResult.chineseName}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.chineseName, "zh-TW")
                            }
                            aria-label={insertValues(
                              t.vocabulary.detail.listenAriaLabel,
                              { text: lookupResult.chineseName },
                            )}
                            title={insertValues(
                              t.vocabulary.detail.listenAriaLabel,
                              { text: lookupResult.chineseName },
                            )}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface transition-transform active:scale-95"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>

                        {isLearningChinese && (
                          <div className="mt-3 rounded-[18px] bg-surface px-4 py-3">
                            <PronunciationBlock
                              english={lookupResult.englishName}
                              chinese={lookupResult.chineseName}
                            />

                            <p className="mt-2 text-[11px] tracking-[0.04em] text-neutral-400">
                              {t.vocabulary.detail.partOfSpeech[
                                normalizePartOfSpeech(
                                  lookupResult.partOfSpeech,
                                )
                              ]}
                            </p>
                          </div>
                        )}
                      </section>
                    );

                    return isLearningChinese
                      ? [chineseSection, englishSection]
                      : [englishSection, chineseSection];
                  })()}
                </div>

                <div className="mt-6 space-y-3 border-t border-black/[0.08] pt-5">
                  {(() => {
                    const englishExampleSection = (
                      <section
                        key="english-example"
                        className="rounded-[20px] bg-surface p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
                              {t.vocabulary.lookup.englishExample}
                            </p>

                            <p className="mt-3 text-[14px] leading-6">
                              {lookupResult.englishExample}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.englishExample, "en-US")
                            }
                            aria-label={t.vocabulary.lookup.englishExample}
                            title={t.vocabulary.lookup.englishExample}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-95"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                      </section>
                    );

                    const chineseExampleSection = (
                      <section
                        key="chinese-example"
                        className="rounded-[20px] bg-surface p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/35">
                              {t.vocabulary.lookup.chineseExample}
                            </p>

                            <p className="mt-3 text-[14px] leading-6 text-neutral-600">
                              {lookupResult.chineseExample}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              speak(lookupResult.chineseExample, "zh-TW")
                            }
                            aria-label={t.vocabulary.lookup.chineseExample}
                            title={t.vocabulary.lookup.chineseExample}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white transition-transform active:scale-95"
                          >
                            <Volume2 size={15} />
                          </button>
                        </div>
                      </section>
                    );

                    return isLearningChinese
                      ? [chineseExampleSection, englishExampleSection]
                      : [englishExampleSection, chineseExampleSection];
                  })()}
                </div>

                {lookupResult.confidence === "low" ? (
                  <p
                    role="status"
                    className="mt-5 rounded-[18px] border border-[#c9962e]/20 bg-[#c9962e]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#6b4e1f]"
                  >
                    {t.vocabulary.lookup.lowConfidenceNotice}
                  </p>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onShare}
                    aria-label={t.vocabulary.lookup.share}
                    className="flex h-11 items-center justify-center gap-2 rounded-full bg-surface text-[12px] font-semibold transition-transform active:scale-[0.98]"
                  >
                    {lookupCopied ? (
                      <Check size={15} />
                    ) : (
                      <Share size={15} />
                    )}
                    {t.vocabulary.lookup.share}
                  </button>

                  <button
                    type="button"
                    onClick={onSend}
                    aria-label={t.vocabulary.lookup.send}
                    className="flex h-11 items-center justify-center gap-2 rounded-full bg-surface text-[12px] font-semibold transition-transform active:scale-[0.98]"
                  >
                    <Send size={15} />
                    {t.vocabulary.lookup.send}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onSave}
                  disabled={savingLookup}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-[13px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-30"
                >
                  {savingLookup ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" />
                      {t.vocabulary.lookup.saving}
                    </>
                  ) : (
                    <>
                      <BookmarkPlus size={16} />
                      {t.vocabulary.lookup.addToVocabulary}
                    </>
                  )}
                </button>
              </div>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
