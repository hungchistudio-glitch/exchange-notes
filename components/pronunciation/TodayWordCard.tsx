"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  Plus,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import ExchangeNotesGlyph from "@/components/ui/ExchangeNotesGlyph";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { getPronunciationData } from "@/lib/pronunciation";
import { speakText, stopSpeech } from "@/lib/pronunciation/playback";
import type { VocabularyItem } from "@/lib/types/app";
import {
  fetchVocabulary,
  getCurrentUser,
} from "@/lib/vocabulary/repository";

import styles from "./TodayWordCard.module.css";

type TodayWordCopy = TranslationDictionary["home"]["todayWord"];
type VocabularyCopy = TranslationDictionary["vocabulary"];

type CardTone = "paper" | "ink" | "silver";


const DECK_ACCENTS = [
  "154 174 194",
  "185 166 195",
  "202 181 132",
  "145 177 169",
  "173 177 185",
] as const;

function wrapIndex(index: number, count: number) {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

function toneForCard(index: number): CardTone {
  const tones: CardTone[] = [
    "ink",
    "paper",
    "silver",
    "paper",
    "ink",
    "silver",
    "paper",
  ];
  return tones[index % tones.length];
}

function LoadingCard() {
  return (
    <section className={styles.loading} aria-hidden="true">
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonPanel} />
      <div className={styles.skeletonPanel} />
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
    <section className={styles.empty}>
      <p className={styles.emptyEyebrow}>{title}</p>
      <h2 className={styles.emptyTitle}>{heading}</h2>
      <p className={styles.emptyDescription}>{description}</p>

      <div className={styles.emptyActions}>
        <Link href="/vocabulary" className={styles.emptyPrimary}>
          <Plus size={15} />
          {addWordLabel}
        </Link>
        <Link href="/capture" className={styles.emptySecondary}>
          <Camera size={15} />
          {captureLabel}
        </Link>
      </div>
    </section>
  );
}

function DeckWordCard({
  item,
  index,
  total,
  interactive,
  tone,
  copy,
  vocabularyCopy,
  isLearningChinese,
}: {
  item: VocabularyItem;
  index: number;
  total: number;
  interactive: boolean;
  tone: CardTone;
  copy: TodayWordCopy;
  vocabularyCopy: VocabularyCopy;
  isLearningChinese: boolean;
}) {
  const word = item.word?.trim() || copy.untitledWord;
  const translation = item.translation?.trim() || "";
  const pronunciation = getPronunciationData({
    english: word,
    chinese: translation,
  });
  const primaryWord = isLearningChinese
    ? translation || word
    : word;
  const secondaryWord = isLearningChinese
    ? word
    : translation;
  const primaryWordLength = Array.from(primaryWord).length;
  const primaryWordSize = primaryWordLength >= 20
    ? "extra-long"
    : primaryWordLength >= 16
      ? "long"
      : primaryWordLength >= 13
        ? "medium"
        : "regular";
  const statusLabel =
    item.status === "new"
      ? vocabularyCopy.detail.levels.new
      : item.status === "learning"
        ? vocabularyCopy.detail.levels.learning
        : vocabularyCopy.detail.levels.mastered;
  const detailHref =
    `/vocabulary?widgetAction=open-word&widgetWordId=${encodeURIComponent(item.id)}`
    + `&widgetNonce=home-${encodeURIComponent(item.id)}`;

  return (
    <article
      className={styles.card}
      data-tone={tone}
      aria-hidden={interactive ? undefined : true}
    >
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.orbit} aria-hidden="true" />

      <div className={styles.cardInner}>
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.eyebrow}>{statusLabel}</p>
            <p className={styles.serial}>
              {String(index + 1).padStart(2, "0")}
              <span aria-hidden="true"> / </span>
              {String(total).padStart(2, "0")}
            </p>
          </div>

          {interactive ? (
            <Link
              href={detailHref}
              aria-label={copy.continueLearning}
              className={styles.markLink}
            >
              <ExchangeNotesGlyph className={styles.mark} />
            </Link>
          ) : (
            <span className={styles.markStatic}>
              <ExchangeNotesGlyph className={styles.mark} />
            </span>
          )}
        </header>

        <div className={styles.hero}>
          <h2
            className={styles.primaryWord}
            data-word-size={primaryWordSize}
          >
            {primaryWord}
          </h2>
          {secondaryWord ? (
            <p className={styles.secondaryWord}>{secondaryWord}</p>
          ) : null}
          <p className={styles.phonetic}>
            {pronunciation.pinyin || pronunciation.zhuyin || "\u00a0"}
          </p>
        </div>

        <div className={styles.soundGrid}>
          <button
            type="button"
            disabled={!interactive}
            tabIndex={interactive ? 0 : -1}
            onClick={() => speakText(
              isLearningChinese ? translation : word,
              isLearningChinese ? "zh-TW" : "en-US",
            )}
            aria-label={
              isLearningChinese
                ? `${copy.zhuyin}: ${pronunciation.zhuyin || translation}`
                : `${copy.englishPronunciation}: ${word}`
            }
            className={styles.soundButton}
          >
            <span className={styles.soundCopy}>
              <span className={styles.soundLabel}>
                {isLearningChinese ? copy.zhuyin : copy.englishPronunciation}
              </span>
              <span
                className={styles.soundValue}
                data-script={isLearningChinese ? "zhuyin" : "english"}
              >
                {isLearningChinese
                  ? pronunciation.zhuyin || translation
                  : word}
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={!interactive || !secondaryWord}
            tabIndex={interactive ? 0 : -1}
            onClick={() => speakText(
              isLearningChinese ? word : translation,
              isLearningChinese ? "en-US" : "zh-TW",
            )}
            aria-label={
              isLearningChinese
                ? `${copy.englishPronunciation}: ${word}`
                : `${copy.zhuyin}: ${pronunciation.zhuyin || translation}`
            }
            className={styles.soundButton}
          >
            <span className={styles.soundCopy}>
              <span className={styles.soundLabel}>
                {isLearningChinese ? copy.englishPronunciation : copy.zhuyin}
              </span>
              <span
                className={styles.soundValue}
                data-script={isLearningChinese ? "english" : "zhuyin"}
              >
                {isLearningChinese
                  ? word
                  : pronunciation.zhuyin || translation}
              </span>
            </span>
          </button>
        </div>

        <footer className={styles.cardFooter}>
          <p className={styles.swipeMicrocopy}>
            <span aria-hidden="true">← · →</span>
            <span className={styles.visuallyHidden}>{copy.swipeHint}</span>
          </p>
          {interactive ? (
            <Link
              href={detailHref}
              aria-label={copy.continueLearning}
              title={copy.continueLearning}
              className={styles.detailLink}
            >
              <BookOpen size={14} />
            </Link>
          ) : (
            <span className={styles.detailStatic} aria-hidden="true">
              <BookOpen size={14} />
            </span>
          )}
        </footer>
      </div>
    </article>
  );
}

/**
 * The deck is a native horizontal scroller.
 *
 * Every earlier version drove this from JavaScript: pointer handlers, a
 * velocity model, a settle animation and per-frame transform writes for seven
 * cards. Six rounds of optimisation could not make it feel like a native
 * carousel, because it never was one — the work happened on the main thread,
 * where anything else on the page competes for the same frames.
 *
 * This hands the whole gesture to the browser. Momentum, rubber-banding,
 * snapping and flick velocity come from the scroller itself, and the depth
 * effect is a scroll-driven animation on `view(x)`, which Safari runs on the
 * compositor thread from 26.4. During a swipe there is no JavaScript at all.
 *
 * What JavaScript is left runs only when the settled card changes: updating
 * the counter, and recentring the loop.
 */
export function TodayWordDeck({
  items,
  copy,
  vocabularyCopy,
  isLearningChinese,
}: {
  items: VocabularyItem[];
  copy: TodayWordCopy;
  vocabularyCopy: VocabularyCopy;
  isLearningChinese: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * Three consecutive copies of the list.
   *
   * A native scroller has ends; this deck does not. Rendering the run three
   * times and jumping the scroll position by one run once a swipe settles near
   * an edge produces an endless deck — the jump is invisible because the card
   * being jumped to is the same card, at the same offset, showing the same
   * word.
   */
  const loop = useMemo(() => {
    if (items.length === 0) return [];

    return Array.from({ length: items.length * 3 }, (_, position) => ({
      position,
      index: position % items.length,
      item: items[position % items.length],
    }));
  }, [items]);

  const slotWidth = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return 0;

    const slot = scroller.firstElementChild as HTMLElement | null;
    return slot?.getBoundingClientRect().width ?? 0;
  };

  const runWidth = () => slotWidth() * items.length;

  // Open on the middle run so there is a full run of cards in either
  // direction before any recentring is needed.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || items.length === 0) return;

    const frame = requestAnimationFrame(() => {
      scroller.scrollLeft = runWidth();
    });

    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  /**
   * Reads the settled card and keeps the loop centred.
   *
   * Bound to scroll rather than to a frame loop, and it only writes state when
   * the rounded position actually changes — a few times per swipe, not a
   * hundred and twenty times a second.
   */
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || items.length === 0) return;

    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    function handleScroll() {
      const width = slotWidth();
      if (!width || !scroller) return;

      const position = Math.round(scroller.scrollLeft / width);
      const next = wrapIndex(position, items.length);

      setActiveIndex((current) => (current === next ? current : next));

      // Recentring mid-gesture would fight the scroller, so it waits for the
      // scrolling to stop.
      if (settleTimer) clearTimeout(settleTimer);

      settleTimer = setTimeout(() => {
        const run = runWidth();
        if (!run || !scroller) return;

        if (scroller.scrollLeft < run * 0.5) {
          scroller.scrollLeft += run;
        } else if (scroller.scrollLeft > run * 1.5) {
          scroller.scrollLeft -= run;
        }
      }, 140);
    }

    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (settleTimer) clearTimeout(settleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => () => stopSpeech(), []);

  /** Arrows scroll by exactly one card; the browser animates and snaps. */
  function step(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    const width = slotWidth();
    if (!scroller || !width) return;

    scroller.scrollBy({ left: direction * width, behavior: "smooth" });
  }

  const accent = DECK_ACCENTS[activeIndex % DECK_ACCENTS.length];

  if (items.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <section
        className={styles.deckSurface}
        style={{ "--deck-accent": accent } as CSSProperties}
        aria-roledescription="carousel"
        aria-label={copy.title}
      >
        <div ref={scrollerRef} className={styles.scroller}>
          {loop.map(({ position, index, item }) => (
            <div key={position} className={styles.slot}>
              <div className={styles.slotInner}>
                <DeckWordCard
                  item={item}
                  index={index}
                  total={items.length}
                  interactive={index === activeIndex}
                  tone={toneForCard(index)}
                  copy={copy}
                  vocabularyCopy={vocabularyCopy}
                  isLearningChinese={isLearningChinese}
                />
              </div>
            </div>
          ))}
        </div>

        {items.length > 1 ? (
          <nav className={styles.deckMeta} aria-label={copy.title}>
            {/* The arrow points where the card travels, matching the direction
                a finger would take it. */}
            <button
              type="button"
              aria-label={copy.nextWord}
              className={styles.navButton}
              onClick={() => step(1)}
            >
              <ArrowLeft size={15} />
            </button>

            <p className={styles.counter} aria-live="polite">
              {String(activeIndex + 1).padStart(2, "0")}
              <span aria-hidden="true"> / </span>
              {String(items.length).padStart(2, "0")}
            </p>

            <button
              type="button"
              aria-label={copy.previousWord}
              className={styles.navButton}
              onClick={() => step(-1)}
            >
              <ArrowRight size={15} />
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

export default function TodayWordCard() {
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);

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

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingCard />;

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
    <TodayWordDeck
      items={items}
      copy={t.home.todayWord}
      vocabularyCopy={t.vocabulary}
      isLearningChinese={isLearningChinese}
    />
  );
}
