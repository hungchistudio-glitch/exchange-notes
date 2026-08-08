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
  type PointerEvent as ReactPointerEvent,
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

type GestureState = {
  x: number;
  dragging: boolean;
  transition: "commit" | "cancel" | null;
};

type PointerState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
  currentX: number;
  dragging: boolean;
  blocked: boolean;
};

type DeckEntry = {
  index: number;
  offset: number;
  item: VocabularyItem;
};

const INITIAL_GESTURE: GestureState = {
  x: 0,
  dragging: false,
  transition: null,
};

const COMMIT_DURATION_MS = 440;
const CANCEL_DURATION_MS = 360;
const MAX_VISIBLE_CARDS = 7;

const DECK_ACCENTS = [
  "154 174 194",
  "185 166 195",
  "202 181 132",
  "145 177 169",
  "173 177 185",
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function centeredTranslateX(value: number) {
  if (Math.abs(value) < 0.01) return "-50%";
  return value < 0
    ? `calc(-50% - ${Math.abs(value)}px)`
    : `calc(-50% + ${value}px)`;
}

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

function visibleDeckEntries(
  items: VocabularyItem[],
  activeIndex: number,
): DeckEntry[] {
  if (items.length === 0) return [];

  const offsets = [0, 1, -1, 2, -2, 3, -3];
  const seen = new Set<number>();
  const entries: DeckEntry[] = [];

  for (const offset of offsets) {
    if (entries.length >= Math.min(items.length, MAX_VISIBLE_CARDS)) {
      break;
    }

    const index = wrapIndex(activeIndex + offset, items.length);
    if (seen.has(index)) continue;

    seen.add(index);
    entries.push({
      index,
      offset,
      item: items[index],
    });
  }

  return entries;
}

function replacePosition(
  template: string,
  current: number,
  total: number,
) {
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

function cardVisual(
  offset: number,
  dragX: number,
  deckWidth: number,
) {
  const progress = clamp(
    deckWidth > 0 ? -dragX / deckWidth : 0,
    -1,
    1,
  );
  const progressAmount = Math.abs(progress);
  const travelDirection = Math.sign(progress);

  if (offset === 0) {
    const rotationZ = -progress * 5.2;
    const rotationY = progress * 7.5;
    const translateY = progressAmount * 15;
    const scale = 1 - progressAmount * 0.016;

    return {
      transform: [
        `translate3d(${centeredTranslateX(dragX)}, ${translateY}px, 58px)`,
        `rotateY(${rotationY}deg)`,
        `rotateZ(${rotationZ}deg)`,
        `scale(${scale})`,
      ].join(" "),
      opacity: 1 - progressAmount * 0.12,
      zIndex: 100,
    };
  }

  const side = Math.sign(offset);
  const depth = Math.abs(offset);
  const isIncoming = travelDirection !== 0 && side === travelDirection;
  const effectiveDepth = isIncoming
    ? Math.max(0, depth - progressAmount)
    : depth + (travelDirection !== 0 ? progressAmount * 0.08 : 0);
  const translateX = side * effectiveDepth * 9.5;
  const translateY = -effectiveDepth * 13;
  const translateZ = -effectiveDepth * 54;
  const rotationZ = side * effectiveDepth * 1.18;
  const rotationY = -side * effectiveDepth * 1.48;
  const scale = 1 - effectiveDepth * 0.034;
  const opacity = clamp(1 - effectiveDepth * 0.075, 0.48, 1);

  return {
    transform: [
      `translate3d(${centeredTranslateX(translateX)}, ${translateY}px, ${translateZ}px)`,
      `rotateY(${rotationY}deg)`,
      `rotateZ(${rotationZ}deg)`,
      `scale(${scale})`,
    ].join(" "),
    opacity,
    zIndex: 90 - depth * 8 + (side > 0 ? 1 : 0),
  };
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [gesture, setGesture] = useState<GestureState>(INITIAL_GESTURE);
  const [deckWidth, setDeckWidth] = useState(320);

  const deckRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerState | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Live card slots, keyed by item id and tagged with the deck offset they
   * were rendered at. A drag writes to these nodes directly: routing every
   * pointermove through state re-rendered the whole deck up to 120 times a
   * second on a ProMotion display, which is what cost the gesture its
   * smoothness. State is only updated once the finger lifts, so the settle
   * animation still runs through React.
   */
  const slotNodesRef = useRef<
    Map<string, { node: HTMLDivElement; offset: number }>
  >(new Map());

  const dragFrameRef = useRef<number | null>(null);
  const pendingDragXRef = useRef(0);

  const normalizedActiveIndex = wrapIndex(activeIndex, items.length);
  const activeItem = items[normalizedActiveIndex];
  const entries = useMemo(
    () => visibleDeckEntries(items, normalizedActiveIndex),
    [items, normalizedActiveIndex],
  );
  const accent = DECK_ACCENTS[
    normalizedActiveIndex % DECK_ACCENTS.length
  ];

  useEffect(() => {
    const node = deckRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      setDeckWidth(node.getBoundingClientRect().width || 320);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
      stopSpeech();
    };
  }, []);

  function clearSettleTimeout() {
    if (!settleTimeoutRef.current) return;
    clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = null;
  }

  function settleTo(direction: -1 | 1) {
    if (items.length < 2 || gesture.transition) return;

    clearSettleTimeout();
    setGesture({
      x: -direction * deckWidth * 1.16,
      dragging: false,
      transition: "commit",
    });

    settleTimeoutRef.current = setTimeout(() => {
      setActiveIndex((current) => wrapIndex(
        current + direction,
        items.length,
      ));
      setGesture(INITIAL_GESTURE);
      settleTimeoutRef.current = null;
    }, COMMIT_DURATION_MS);
  }

  function cancelGesture() {
    clearSettleTimeout();
    setGesture({
      x: 0,
      dragging: false,
      transition: "cancel",
    });

    settleTimeoutRef.current = setTimeout(() => {
      setGesture(INITIAL_GESTURE);
      settleTimeoutRef.current = null;
    }, CANCEL_DURATION_MS);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      items.length < 2
      || gesture.transition
      || event.button !== 0
    ) {
      return;
    }

    // Element, not HTMLElement: the sound and detail buttons hold <svg>
    // icons, so a press on the icon itself reports an SVGElement target and
    // would otherwise slip past this guard and start a drag.
    const target = event.target;
    if (
      target instanceof Element
      && target.closest("button, a")
    ) {
      return;
    }

    clearSettleTimeout();
    event.currentTarget.setPointerCapture(event.pointerId);

    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocityX: 0,
      currentX: 0,
      dragging: false,
      blocked: false,
    };
    setGesture(INITIAL_GESTURE);
  }

  function paintDrag(x: number) {
    for (const { node, offset } of slotNodesRef.current.values()) {
      const visual = cardVisual(offset, x, deckWidth);

      // transform and opacity only. These are the two properties a compositor
      // can apply without repainting anything; every other write here forced
      // work it could otherwise skip.
      //
      // zIndex is deliberately not written: it derives from `offset` alone, so
      // it cannot change mid-drag — it was being set 120 times a second to the
      // value it already held, and each write re-evaluated stacking order.
      node.style.transform = visual.transform;
      node.style.opacity = String(visual.opacity);
    }
  }

  /**
   * Pointer events can outpace the display, so paints are coalesced to one
   * per frame. Without this a 120Hz stream of moves would queue redundant
   * style writes that the next move overwrites anyway.
   */
  function scheduleDragPaint(x: number) {
    pendingDragXRef.current = x;

    if (dragFrameRef.current !== null) return;

    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      paintDrag(pendingDragXRef.current);
    });
  }

  function cancelDragPaint() {
    if (dragFrameRef.current === null) return;

    cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = null;
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (
      !pointer
      || pointer.pointerId !== event.pointerId
      || pointer.blocked
    ) {
      return;
    }

    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;

    if (!pointer.dragging) {
      if (
        Math.abs(deltaY) > 10
        && Math.abs(deltaY) > Math.abs(deltaX) * 1.12
      ) {
        pointer.blocked = true;
        return;
      }

      if (Math.abs(deltaX) < 8) return;
      pointer.dragging = true;

      // The only state write of the whole gesture. It flips the slots out of
      // their CSS transition so the per-frame writes below are not fighting
      // an interpolation.
      setGesture({ x: 0, dragging: true, transition: null });
    }

    event.preventDefault();
    // The moment the event happened, not the moment this handler ran, so a
    // delayed handler cannot inflate the measured velocity.
    const now = event.timeStamp;
    const elapsed = Math.max(now - pointer.lastTime, 1);
    const instantaneousVelocity = (event.clientX - pointer.lastX) / elapsed;
    pointer.velocityX = pointer.velocityX * 0.48 + instantaneousVelocity * 0.52;
    pointer.lastX = event.clientX;
    pointer.lastTime = now;

    const resistanceLimit = deckWidth * 0.82;
    const resistedX = Math.abs(deltaX) > resistanceLimit
      ? Math.sign(deltaX)
        * (resistanceLimit + (Math.abs(deltaX) - resistanceLimit) * 0.16)
      : deltaX;

    pointer.currentX = resistedX;
    scheduleDragPaint(resistedX);
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;

    pointerRef.current = null;

    // A queued paint would land after React commits the settle target and
    // snap the cards back to the drag position mid-animation.
    cancelDragPaint();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!pointer.dragging || pointer.blocked) {
      cancelGesture();
      return;
    }

    const projectedX = pointer.currentX + pointer.velocityX * 220;
    const shouldCommit =
      Math.abs(projectedX) > deckWidth * 0.18
      || Math.abs(pointer.velocityX) > 0.42;

    if (!shouldCommit) {
      cancelGesture();
      return;
    }

    const direction: -1 | 1 = projectedX < 0 ? 1 : -1;
    settleTo(direction);
  }

  function cancelPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;

    pointerRef.current = null;

    // A queued paint would land after React commits the settle target and
    // snap the cards back to the drag position mid-animation.
    cancelDragPaint();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cancelGesture();
  }

  const transition = gesture.dragging
    ? "none"
    : gesture.transition === "cancel"
      ? `transform ${CANCEL_DURATION_MS}ms cubic-bezier(0.2, 1.3, 0.32, 1), opacity 260ms ease`
      : gesture.transition === "commit"
        ? `transform ${COMMIT_DURATION_MS}ms cubic-bezier(0.2, 0.88, 0.24, 1), opacity 340ms ease`
        : "none";

  return (
    <div className={styles.wrapper}>
      <section
        className={styles.deckSurface}
        style={{ "--deck-accent": accent } as CSSProperties}
        aria-roledescription="carousel"
        aria-label={copy.title}
      >
        <div
          ref={deckRef}
          className={styles.deckViewport}
          data-dragging={gesture.dragging ? "true" : "false"}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={cancelPointer}
        >
          {entries.map(({ item, index, offset }) => {
            const visual = cardVisual(
              offset,
              gesture.x,
              deckWidth,
            );
            const interactive = offset === 0;

            return (
              <div
                key={item.id}
                ref={(node) => {
                  const slots = slotNodesRef.current;
                  if (node) {
                    slots.set(item.id, { node, offset });
                  } else {
                    slots.delete(item.id);
                  }
                }}
                className={styles.cardSlot}
                style={{
                  transform: visual.transform,
                  opacity: visual.opacity,
                  zIndex: visual.zIndex,
                  transition,
                  pointerEvents: interactive ? "auto" : "none",
                }}
              >
                <DeckWordCard
                  item={item}
                  index={index}
                  total={items.length}
                  interactive={interactive}
                  tone={toneForCard(index)}
                  copy={copy}
                  vocabularyCopy={vocabularyCopy}
                  isLearningChinese={isLearningChinese}
                />
              </div>
            );
          })}
        </div>

        {items.length > 1 ? (
          <nav className={styles.deckMeta} aria-label={copy.title}>
            <button
              type="button"
              aria-label={copy.previousWord}
              className={styles.navButton}
              disabled={Boolean(gesture.transition)}
              onClick={() => settleTo(-1)}
            >
              <ArrowLeft size={15} />
            </button>

            <p className={styles.counter} aria-hidden="true">
              {String(normalizedActiveIndex + 1).padStart(2, "0")}
              <span> / </span>
              {String(items.length).padStart(2, "0")}
            </p>

            <button
              type="button"
              aria-label={copy.nextWord}
              className={styles.navButton}
              disabled={Boolean(gesture.transition)}
              onClick={() => settleTo(1)}
            >
              <ArrowRight size={15} />
            </button>
          </nav>
        ) : null}
      </section>

      <p className={styles.liveRegion} aria-live="polite">
        {activeItem
          ? `${replacePosition(
              copy.positionLabel,
              normalizedActiveIndex + 1,
              items.length,
            )}: ${activeItem.word}`
          : ""}
      </p>
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
