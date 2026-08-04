"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Camera, Plus, Volume2 } from "lucide-react";

import { speakText, stopSpeech } from "@/lib/pronunciation/playback";
import { getPronunciationData } from "@/lib/pronunciation";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";
import type { VocabularyItem } from "@/lib/types/app";

import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";

function LoadingCard() {
  return (
    <section className="animate-pulse rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="h-3 w-24 rounded bg-neutral-200" />
      <div className="mt-4 h-9 w-44 rounded bg-neutral-200" />

      <div className="mt-6 space-y-3">
        <div className="h-16 rounded-2xl bg-neutral-100" />
        <div className="h-16 rounded-2xl bg-neutral-100" />
      </div>
    </section>
  );
}

function EmptyCard({
  title,
  heading,
  description,
  addWordLabel,
  captureLabel,
}: {
  title: string;
  heading: string;
  description: string;
  addWordLabel: string;
  captureLabel: string;
}) {
  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        {title}
      </p>

      <h2 className="mt-3 text-2xl font-bold">{heading}</h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-600">
        {description}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Link
          href="/vocabulary"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-black text-sm font-medium text-white transition-transform active:scale-[0.98]"
        >
          <Plus size={16} />
          {addWordLabel}
        </Link>

        <Link
          href="/capture"
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-neutral-200 text-sm font-medium text-black transition-transform active:scale-[0.98]"
        >
          <Camera size={16} />
          {captureLabel}
        </Link>
      </div>
    </section>
  );
}

function WordSlide({
  item,
  continueLearningLabel,
  englishLabel,
  zhuyinLabel,
  exampleLabel,
  untitledWordLabel,
  statusLabels,
  playEnglishExampleAriaLabel,
  playChineseExampleAriaLabel,
  isLearningChinese,
}: {
  item: VocabularyItem;
  continueLearningLabel: string;
  englishLabel: string;
  zhuyinLabel: string;
  exampleLabel: string;
  untitledWordLabel: string;
  statusLabels: { new: string; learning: string; mastered: string };
  playEnglishExampleAriaLabel: string;
  playChineseExampleAriaLabel: string;
  isLearningChinese: boolean;
}) {
  const word = item.word?.trim() || untitledWordLabel;
  const translation = item.translation?.trim() || "";
  const pronunciation = getPronunciationData({
    english: word,
    chinese: translation,
  });
  const example = item.example_sentence?.trim();
  const translatedExample = item.translated_example?.trim();

  const statusLabel =
    item.status === "new"
      ? statusLabels.new
      : item.status === "learning"
        ? statusLabels.learning
        : statusLabels.mastered;

  return (
    <section className="w-full shrink-0 snap-center rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            {statusLabel}
          </p>
          <h2 className="mt-2 truncate text-3xl font-bold">
            {isLearningChinese ? translation || word : word}
          </h2>
        </div>

        <Link
          href="/vocabulary"
          aria-label={continueLearningLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black transition-transform hover:bg-neutral-100 active:scale-90"
        >
          <BookOpen size={18} />
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {(() => {
          const englishIsPrimary = !isLearningChinese;
          const primaryButtonClass =
            "flex w-full items-center justify-between rounded-2xl border border-black bg-black px-4 py-3 text-left text-white transition active:scale-[0.99]";
          const secondaryButtonClass =
            "flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-left text-black/45 transition active:scale-[0.99]";
          const primaryValueClass = "text-lg font-semibold";
          const secondaryValueClass = "font-normal";
          const primaryLabelClass = "text-sm text-white/60";
          const secondaryLabelClass = "text-sm text-neutral-400";

          const englishButton = (
            <button
              key="english"
              type="button"
              onClick={() => speakText(word, "en-US")}
              className={
                englishIsPrimary ? primaryButtonClass : secondaryButtonClass
              }
            >
              <div>
                <div
                  className={
                    englishIsPrimary ? primaryLabelClass : secondaryLabelClass
                  }
                >
                  {englishLabel}
                </div>
                <div
                  className={
                    englishIsPrimary ? primaryValueClass : secondaryValueClass
                  }
                >
                  {word}
                </div>
              </div>
              <Volume2 size={18} />
            </button>
          );

          const zhuyinButton = (
            <button
              key="zhuyin"
              type="button"
              onClick={() => speakText(translation, "zh-TW")}
              className={
                !englishIsPrimary ? primaryButtonClass : secondaryButtonClass
              }
            >
              <div>
                <div
                  className={
                    !englishIsPrimary
                      ? primaryLabelClass
                      : secondaryLabelClass
                  }
                >
                  {zhuyinLabel}
                </div>
                <div
                  className={`font-zhuyin tracking-[0.02em] ${
                    !englishIsPrimary ? primaryValueClass : secondaryValueClass
                  }`}
                >
                  {pronunciation.zhuyin || translation}
                </div>
                {pronunciation.zhuyin && (
                  <div
                    className={
                      !englishIsPrimary
                        ? "mt-1 text-sm text-white/60"
                        : "mt-1 text-sm text-neutral-400"
                    }
                  >
                    {translation}
                  </div>
                )}
              </div>
              <Volume2 size={18} />
            </button>
          );

          return isLearningChinese
            ? [zhuyinButton, englishButton]
            : [englishButton, zhuyinButton];
        })()}
      </div>

      {(example || translatedExample) && (
        <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {exampleLabel}
          </p>

          <div className="mt-3 space-y-2">
            {(() => {
              const englishExampleBlock = example ? (
                <div
                  key="english-example"
                  className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3"
                >
                  <p className="min-w-0 font-medium leading-6 text-neutral-900">
                    {example}
                  </p>
                  <button
                    type="button"
                    onClick={() => speakText(example, "en-US")}
                    aria-label={playEnglishExampleAriaLabel}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 transition active:scale-90"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              ) : null;

              const chineseExampleBlock = translatedExample ? (
                <div
                  key="chinese-example"
                  className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3"
                >
                  <p className="min-w-0 text-sm leading-6 text-neutral-600">
                    {translatedExample}
                  </p>
                  <button
                    type="button"
                    onClick={() => speakText(translatedExample, "zh-TW")}
                    aria-label={playChineseExampleAriaLabel}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 transition active:scale-90"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              ) : null;

              return isLearningChinese
                ? [chineseExampleBlock, englishExampleBlock]
                : [englishExampleBlock, chineseExampleBlock];
            })()}
          </div>
        </div>
      )}
    </section>
  );
}

export default function TodayWordCard() {
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { user } = await getCurrentUser();

      if (!user || !active) {
        if (active) setLoading(false);
        return;
      }

      const vocabulary = await fetchVocabulary(user.id);

      if (active) {
        setItems((vocabulary ?? []) as VocabularyItem[]);
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;

    const slideWidth = el.clientWidth;
    if (slideWidth === 0) return;

    const index = Math.round(el.scrollLeft / slideWidth);
    setActiveIndex(Math.min(Math.max(index, 0), items.length - 1));
  }

  if (loading) {
    return <LoadingCard />;
  }

  if (items.length === 0) {
    return (
      <EmptyCard
        title={t.home.todayWord.title}
        heading={t.home.todayWord.emptyHeading}
        description={t.home.todayWord.emptyDescription}
        addWordLabel={t.vocabulary.search.addWord}
        captureLabel={t.home.quickStart.capture}
      />
    );
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <WordSlide
            key={item.id}
            item={item}
            continueLearningLabel={t.home.todayWord.continueLearning}
            englishLabel={t.home.todayWord.englishPronunciation}
            zhuyinLabel={t.home.todayWord.zhuyin}
            exampleLabel={t.home.todayWord.example}
            untitledWordLabel={t.home.todayWord.untitledWord}
            statusLabels={t.vocabulary.detail.levels}
            playEnglishExampleAriaLabel={
              t.home.todayWord.playEnglishExampleAriaLabel
            }
            playChineseExampleAriaLabel={
              t.home.todayWord.playChineseExampleAriaLabel
            }
            isLearningChinese={isLearningChinese}
          />
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.slice(0, 12).map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-4 bg-black"
                  : "w-1.5 bg-black/15"
              }`}
            />
          ))}
          {items.length > 12 && (
            <span className="ml-0.5 text-[10px] text-black/30">
              +{items.length - 12}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
