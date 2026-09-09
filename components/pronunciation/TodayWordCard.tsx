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
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import ExchangeNotesGlyph from "@/components/ui/ExchangeNotesGlyph";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { TranslationDictionary } from "@/lib/i18n/types";
import usePhonetics from "@/hooks/usePhonetics";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
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

// Same reason as BottomNavigation: keeps React quiet during server rendering
// while still writing before paint once hydrated, which is the entire point.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  learningLanguage,
  supportLanguage,
}: {
  item: VocabularyItem;
  index: number;
  total: number;
  interactive: boolean;
  tone: CardTone;
  copy: TodayWordCopy;
  vocabularyCopy: VocabularyCopy;
  learningLanguage: LanguageCode;
  supportLanguage: LanguageCode;
}) {
  const word = item.word?.trim() || copy.untitledWord;
  const translation = item.translation?.trim() || "";
  /*
   * Both readings on this card, looked up together.
   *
   * They used to be computed from pinyin-pro, which is what carried 640KB of
   * dictionary onto the home screen — this card is on it. One batched request
   * per language answers them, cached for the session and mirrored to the
   * device, so it is a round trip once and instant afterwards.
   */
  const phoneticsFor = usePhonetics([
    { text: translation, language: "zh-TW" as const },
  ]);
  const pronunciation = phoneticsFor({
    text: translation,
    language: "zh-TW",
  });
  /*
   * The row records its own two languages, so which side leads is read from
   * it rather than from a yes/no about Chinese — a question with no answer
   * for a word saved under a different pairing.
   */
  const sides = getVocabularyCardSides(item, learningLanguage, supportLanguage);
  const sidePhoneticsFor = usePhonetics([
    { text: sides.primary.text, language: sides.primary.language },
    { text: sides.secondary.text, language: sides.secondary.language },
  ]);
  const primaryWord = sides.primary.text || word;
  const secondaryWord = sides.secondary.text;
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
            {pronunciation?.pinyin || pronunciation?.zhuyin || "\u00a0"}
          </p>
        </div>

        {/*
          One button per side, each showing whatever annotation its own
          language has: zhuyin under Chinese, the word itself under a
          language whose spelling already tells you how to say it. The
          labels used to be two dictionary keys named after two languages.
        */}
        <div className={styles.soundGrid}>
          {[sides.primary, sides.secondary].map((side) => {
            const language = getLanguage(side.language);
            const phonetics = sidePhoneticsFor({
              text: side.text,
              language: side.language,
            });
            const annotation = phonetics?.zhuyin || side.text;
            const label = language.endonym;

            return (
              <button
                key={side.language}
                type="button"
                disabled={!interactive || !side.text}
                tabIndex={interactive ? 0 : -1}
                onClick={() => speakText(side.text, language.speechTag)}
                aria-label={`${label}: ${annotation}`}
                className={styles.soundButton}
              >
                <span className={styles.soundCopy}>
                  <span className={styles.soundLabel}>{label}</span>
                  <span
                    className={styles.soundValue}
                    data-script={phonetics?.zhuyin ? "zhuyin" : "english"}
                  >
                    {annotation}
                  </span>
                </span>
              </button>
            );
          })}
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
/** Slots either side of centre. Nine cards total, whatever the list size. */
const WINDOW_RADIUS = 4;

/**
 * The deck is a native horizontal scroller over a fixed window of cards.
 *
 * Every earlier version drove this from JavaScript: pointer handlers, a
 * velocity model, a settle animation and per-frame transform writes. It never
 * felt native because it never was — the work ran on the main thread, against
 * everything else on the page.
 *
 * The gesture now belongs to the browser. Momentum, rubber-banding, flick
 * velocity and snapping come from a scroll-snap container, and the depth is a
 * scroll-driven animation on view(x), which Safari runs on the compositor from
 * 26.4. No JavaScript executes during a swipe.
 *
 * The window is what makes that affordable. A first attempt rendered the whole
 * list three times over for cyclic scrolling; at 175 saved words that is 525
 * cards and over thirty thousand elements, and the phone could not render it
 * at all. Nine slots are held instead, re-pointed at different words as the
 * deck moves, so the DOM cost is the same for 20 words or 2,000.
 */
export function TodayWordDeck({
  items,
  copy,
  vocabularyCopy,
  learningLanguage,
  supportLanguage,
}: {
  items: VocabularyItem[];
  copy: TodayWordCopy;
  vocabularyCopy: VocabularyCopy;
  learningLanguage: LanguageCode;
  supportLanguage: LanguageCode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const window_ = useMemo(() => {
    if (items.length === 0) return [];

    return Array.from({ length: WINDOW_RADIUS * 2 + 1 }, (_, slot) => {
      const offset = slot - WINDOW_RADIUS;
      const index = wrapIndex(activeIndex + offset, items.length);

      return { slot, offset, index, item: items[index] };
    });
  }, [items, activeIndex]);

  function slotWidth() {
    const scroller = scrollerRef.current;
    const slot = scroller?.firstElementChild as HTMLElement | null;
    return slot?.getBoundingClientRect().width ?? 0;
  }

  /**
   * Puts the middle slot under the snap point without animating.
   *
   * Needs no guard against being read back as a swipe. The settle below only
   * acts on a landing that is off centre, and this lands exactly on centre by
   * construction, so the event it provokes is already a no-op.
   *
   * There used to be a flag here cleared inside requestAnimationFrame, which
   * is a promise the browser does not always keep: rAF is deferred in a
   * background tab and can be throttled under low power. Any frame it skipped
   * left the flag raised and every later swipe ignored — the deck simply
   * stopped moving. An invariant cannot get stuck the way a flag can.
   */
  function centreScroll() {
    const scroller = scrollerRef.current;
    const width = slotWidth();
    if (!scroller || !width) return;

    scroller.scrollLeft = width * WINDOW_RADIUS;
  }

  /*
   * Recentring belongs here, after React has committed the window built from
   * the new activeIndex and before the browser paints.
   *
   * It used to run inline right after setActiveIndex, which cannot work:
   * setState is asynchronous, so scrollLeft was reset while the DOM still held
   * the previous window. For one frame the middle slot showed the card the
   * swipe had just left, and only then did the correct one replace it — the
   * flash of the previous card. A layout effect puts both in the same paint,
   * which is what the old inline comment assumed was already true.
   *
   * Width can still be zero on the very first pass if the slots have not been
   * laid out; a frame later they have.
   */
  useIsomorphicLayoutEffect(() => {
    if (items.length === 0) return;

    if (slotWidth()) {
      centreScroll();
      return;
    }

    const frame = requestAnimationFrame(centreScroll);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, items.length]);

  /**
   * Moves the window to wherever the swipe settled.
   *
   * Nothing runs during the swipe itself — the scroller snaps natively — and
   * this does its work once it has come to rest.
   *
   * "At rest" comes from scrollend where the browser reports it, which is
   * exact and immediate. The 120ms quiet period is only the fallback for
   * engines without it, and it was always a guess: too short and a slow finger
   * settles the deck mid-swipe, too long and the counter lags behind the card.
   */
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || items.length === 0) return;

    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const settle = () => {
      const width = slotWidth();
      if (!width) return;

      const landed = Math.round(node.scrollLeft / width);
      const moved = landed - WINDOW_RADIUS;
      if (moved === 0) return;

      // Only the window moves here. The scroll returns to centre in the layout
      // effect above, once the DOM actually holds the new window.
      setActiveIndex((current) => wrapIndex(current + moved, items.length));
    };

    const hasScrollEnd = "onscrollend" in window;

    const handleScrollEnd = () => settle();

    const handleScroll = () => {
      if (settleTimer) clearTimeout(settleTimer);

      settleTimer = setTimeout(settle, 120);
    };

    if (hasScrollEnd) {
      node.addEventListener("scrollend", handleScrollEnd, { passive: true });
    } else {
      node.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      node.removeEventListener("scrollend", handleScrollEnd);
      node.removeEventListener("scroll", handleScroll);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [items.length]);

  useEffect(() => () => stopSpeech(), []);

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
          {window_.map(({ slot, offset, index, item }) => (
            <div key={slot} className={styles.slot}>
              <div className={styles.slotInner}>
                <DeckWordCard
                  item={item}
                  index={index}
                  total={items.length}
                  interactive={offset === 0}
                  tone={toneForCard(index)}
                  copy={copy}
                  vocabularyCopy={vocabularyCopy}
                  learningLanguage={learningLanguage}
      supportLanguage={supportLanguage}
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
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
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
      learningLanguage={learningLanguage}
      supportLanguage={supportLanguage}
    />
  );
}
