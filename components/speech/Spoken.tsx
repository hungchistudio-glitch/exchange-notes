"use client";

import { Play, Square } from "lucide-react";
import {
  Fragment,
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { RubyRange, isWordLike, useWordFurigana } from "@/components/speech/Furigana";
import useInterfaceLanguage from "@/hooks/preferences/useInterfaceLanguage";
import useTranslation from "@/hooks/i18n/useTranslation";
import { hasKanji, type FuriganaSegment } from "@/lib/japanese/kana";
import useCosmicMode from "@/hooks/useCosmicMode";
import type { SpeechLanguage } from "@/lib/speech";
import type { TextRange } from "@/lib/vocabulary/knownWords";
import {
  getServerWordByWord,
  getSpoken,
  getWordByWord,
  isCharByChar,
  playSpoken,
  playSpokenFrom,
  segmentAt,
  segmentSpoken,
  segmentWords,
  setWordByWord,
  spokenKey,
  stopSpoken,
  subscribeToSpoken,
  subscribeToWordByWord,
  type PlaySpokenOptions,
} from "@/lib/spokenWords";

/* =========================================================
   Every speaker key, and the words it lights (Chi, 2026-11-14)

   Chi asked for every speaker in the app to light the word it is saying,
   as the lookup card's already did. The pieces it needs are here, once:

   - SpeakKey (and useSpeakToggle, for a key that carries more than a
     glyph): ▶ before it plays and ■ while it does. Chi chose the play
     triangle for the lookup card (2026-11-13) and then for every speaker.
   - SpokenText: a text that lights the word being said, with the marker
     the lookup card had (.spoken-now). While it plays, a tapped word reads
     on from there; `tapToStart` lets a tap start it, where the text is not
     already part of something tappable. A lit word that goes out of view is
     scrolled back to, as long as the reader was following it.
   - SpokenReading: a word's zhuyin, pinyin or IPA, lit with it, syllable
     by syllable for a Chinese word.
   - WordByWordSwitch: the one switch, for the whole app.

   The state behind them all is lib/spokenWords.ts.
   ========================================================= */

/** The lit segment of this text, or null while it is not sounding. */
export function useSpokenSegment(key: string): number | null {
  return useSyncExternalStore(
    subscribeToSpoken,
    () => {
      const spoken = getSpoken();
      return spoken?.key === key ? spoken.segment : null;
    },
    () => null,
  );
}

/** Whether the run of this name is sounding. */
export function useSpokenRun(run: string): boolean {
  return useSyncExternalStore(
    subscribeToSpoken,
    () => getSpoken()?.run === run,
    () => false,
  );
}

/** How far through the run of this name, 0 to 1, or 0 when it is not sounding. */
export function useSpokenProgress(run: string): number {
  return useSyncExternalStore(
    subscribeToSpoken,
    () => {
      const spoken = getSpoken();
      return spoken?.run === run ? spoken.progress : 0;
    },
    () => 0,
  );
}

function runOf(options: PlaySpokenOptions): string {
  if (options.run) return options.run;
  const first = options.parts?.[0];
  if (first) return first.key ?? spokenKey(first.text, first.lang);
  return options.key ?? spokenKey(options.text ?? "", options.lang ?? "");
}

/** Plays and stops one run: for a key that carries more than the glyph. */
export function useSpeakToggle(options: PlaySpokenOptions) {
  const run = runOf(options);
  const playing = useSpokenRun(run);

  return {
    playing,
    run,
    toggle: () => {
      if (playing) stopSpoken();
      else playSpoken({ ...options, run });
    },
  };
}

/** ▶, and ■ while it plays. */
export function SpeakGlyph({ playing, size = 15 }: { playing: boolean; size?: number }) {
  return playing ? (
    <Square size={Math.round(size * 0.8)} fill="currentColor" strokeWidth={0} aria-hidden="true" />
  ) : (
    /* Nudged right: a triangle's weight sits left of its box's centre. */
    <Play size={size} fill="currentColor" strokeWidth={0} className="translate-x-px" aria-hidden="true" />
  );
}

type SpeakKeyProps = PlaySpokenOptions & {
  className?: string;
  /** Added while it plays. */
  playingClassName?: string;
  iconSize?: number;
  /** Its name before it plays, if not "Play". While it plays it is "Stop". */
  label?: string;
  /** Keeps the tap from reaching a card or row the key sits on. */
  isolate?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  /** Words after the glyph, for a key that says what it does. */
  caption?: ReactNode;
  /** Drawn instead of the glyph. */
  children?: ReactNode;
};

/** A speaker key: ▶ to play its text and light each word, ■ to stop. */
export function SpeakKey({
  className = "",
  playingClassName = "",
  iconSize = 15,
  label,
  isolate = false,
  disabled = false,
  style,
  caption,
  children,
  ...options
}: SpeakKeyProps) {
  const { t } = useTranslation();
  const { playing, toggle } = useSpeakToggle(options);
  const name = playing ? t.common.stop : label ?? t.common.play;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        if (isolate) {
          event.preventDefault();
          event.stopPropagation();
        }
        toggle();
      }}
      aria-pressed={playing}
      aria-label={name}
      title={name}
      data-speak-key=""
      className={`${className} ${playing ? playingClassName : ""}`}
      style={style}
    >
      {children ?? <SpeakGlyph playing={playing} size={iconSize} />}
      {caption}
    </button>
  );
}

/* ---------- where a tap lands ---------- */

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/** The character offset into `container`'s text under a point, if it can be told. */
function offsetAt(container: HTMLElement, x: number, y: number): number | null {
  const doc = document as CaretDocument;
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    if (position) {
      node = position.offsetNode;
      offset = position.offset;
    }
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    if (range) {
      node = range.startContainer;
      offset = range.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !container.contains(node)) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let before = 0;
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (text === node) return before + offset;
    before += text.textContent?.length ?? 0;
  }
  return null;
}

/* ---------- following the lit word ---------- */

/** The part of the screen a lit word can be read in: the viewport, inside any scrolling sheet. */
function inView(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  /* Not laid out (hidden, or no layout at all): nothing to follow. */
  if (rect.width === 0 && rect.height === 0) return true;
  let top = 64;
  let bottom = window.innerHeight - 88;
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const overflow = getComputedStyle(parent).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && parent.scrollHeight > parent.clientHeight) {
      const box = parent.getBoundingClientRect();
      top = Math.max(top, box.top + 8);
      bottom = Math.min(bottom, box.bottom - 8);
      break;
    }
  }
  return rect.top >= top && rect.bottom <= bottom;
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type SpokenTextProps = {
  text: string;
  lang: SpeechLanguage;
  /**
   * A tap on a word starts it from there even while it is silent. Leave it
   * off where the text sits inside something that already does a tap's work
   * (a card that opens, a row that flips): there a tapped word reads on only
   * while the text is sounding.
   */
  tapToStart?: boolean;
  /**
   * False where a tap on the text belongs to what it sits in, even while it
   * sounds: a Lab key that plays and stops its own word.
   */
  tappable?: boolean;
  /**
   * Character ranges to mark as words the reader has kept (Chi, 2026-11-15:
   * 新聞裡學過的字發光). Sorted and apart; lib/vocabulary/knownWords.ts makes them.
   */
  marks?: readonly TextRange[];
  /** A word held down: looked up where the reader is (Chi, 2026-11-15). */
  onLongPressWord?: (word: string) => void;
  /**
   * Japanese furigana for this text, its segments' plain text being `text`
   * (useWordFurigana, useTextFurigana). Drawn whether or not it is
   * sounding, so the reading lights with its kanji (Chi, 2026-11-16).
   */
  ruby?: readonly FuriganaSegment[];
  className?: string;
};

/** How long a press is held before it is a long press. */
const LONG_PRESS_MS = 450;
/** A finger that moves further than this is scrolling, not pressing. */
const LONG_PRESS_SLOP_PX = 10;

/** The text cut at the marks: plain runs, and the marked words in a span. */
function markedRuns(text: string, marks: readonly TextRange[]) {
  const runs: Array<{ text: string; start: number; known: boolean }> = [];
  let at = 0;
  for (const mark of marks) {
    if (mark.start < at || mark.end <= mark.start) continue;
    if (mark.start > at) runs.push({ text: text.slice(at, mark.start), start: at, known: false });
    runs.push({ text: text.slice(mark.start, mark.end), start: mark.start, known: true });
    at = mark.end;
  }
  if (at < text.length) runs.push({ text: text.slice(at), start: at, known: false });
  return runs;
}

/**
 * Text that lights the word being said, while it is being said.
 *
 * Plain text the rest of the time: the split into words is only made while
 * this text is sounding, so a page full of sentences is not a page full of
 * spans for nothing.
 */
export function SpokenText(props: SpokenTextProps) {
  const interfaceLanguage = useInterfaceLanguage();
  /*
   * Japanese with kanji gets furigana on its own (Chi, 2026-11-16) — a
   * word's reading fetched like any card's, running text sentence by
   * sentence — unless the app itself is in Japanese: a reader who reads the
   * interface in Japanese does not need the kanji spelled out for them.
   * Asked of the interface rather than the account's languages, because
   * this renders outside the signed-in providers too (a hello, the landing).
   */
  const wantsReading =
    !props.ruby &&
    interfaceLanguage !== "japanese" &&
    props.lang.toLowerCase().startsWith("ja") &&
    hasKanji(props.text);
  return wantsReading ? <SpokenTextWithReading {...props} /> : <SpokenTextInner {...props} />;
}

function SpokenTextWithReading(props: SpokenTextProps) {
  /* A word is read as a card's word; anything longer, sentence by sentence,
     and only if furigana is on for running text too. */
  const ruby = useWordFurigana(props.text, "ja", isWordLike(props.text) ? "card" : "text");
  return <SpokenTextInner {...props} ruby={ruby} />;
}

function SpokenTextInner({
  text,
  lang,
  tapToStart = false,
  tappable = true,
  marks,
  onLongPressWord,
  ruby,
  className,
}: SpokenTextProps) {
  const key = spokenKey(text, lang);
  const segment = useSpokenSegment(key);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const lastSegment = useRef<number | null>(null);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  /* The click a long press ends in is the press's, not a tap's. */
  const pressed = useRef(false);

  const endPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => endPress, []);

  const longPress = onLongPressWord
    ? {
        onPointerDown: (event: PointerEvent<HTMLSpanElement>) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          endPress();
          pressed.current = false;
          const container = event.currentTarget;
          const { clientX: x, clientY: y } = event;
          press.current = {
            x,
            y,
            timer: window.setTimeout(() => {
              press.current = null;
              const offset = offsetAt(container, x, y);
              if (offset === null) return;
              const segments = segmentWords(text, lang);
              const at = segmentAt(segments, offset);
              if (at < 0) return;
              pressed.current = true;
              window.getSelection?.()?.removeAllRanges();
              onLongPressWord(segments[at].text);
            }, LONG_PRESS_MS),
          };
        },
        onPointerMove: (event: PointerEvent<HTMLSpanElement>) => {
          const start = press.current;
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_SLOP_PX) endPress();
        },
        onPointerUp: endPress,
        onPointerCancel: endPress,
        onPointerLeave: endPress,
        onContextMenu: (event: MouseEvent<HTMLSpanElement>) => event.preventDefault(),
      }
    : {};

  /* Follows the lit word out of view, but only while the reader is following
     it: if the word lit last is still in view, the next one is brought into
     view; if they have scrolled away from it, they are left where they are. */
  useEffect(() => {
    if (segment === null || segment < 0) {
      if (segment === null) lastSegment.current = null;
      return;
    }
    const container = containerRef.current;
    const mark = container?.querySelector<HTMLElement>("[data-spoken-now]");
    if (!container || !mark || container.closest("[inert], [aria-hidden='true']")) return;
    const previous = lastSegment.current === null
      ? null
      : container.querySelector<HTMLElement>(`[data-segment="${lastSegment.current}"]`);
    const following = previous ? inView(previous) : true;
    if (following && !inView(mark)) {
      mark.scrollIntoView?.({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
    lastSegment.current = segment;
  }, [segment]);

  const onClick = (event: MouseEvent<HTMLSpanElement>) => {
    if (pressed.current) {
      pressed.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!tappable) return;
    const sounding = getSpoken()?.key === key;
    if (!sounding && !tapToStart) return;
    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed) return;

    /* A word on its own has nowhere to read on from: inside something
       tappable, the tap is that thing's. */
    const segments = segmentSpoken(text, lang);
    if (!tapToStart && segments.filter((part) => part.word).length < 2) return;

    event.preventDefault();
    event.stopPropagation();

    const offset = isCharByChar(text, lang) ? null : offsetAt(event.currentTarget, event.clientX, event.clientY);
    const at = offset === null ? -1 : segmentAt(segments, offset);

    if (sounding && at >= 0 && playSpokenFrom(key, at)) return;
    playSpoken({ key, text, lang, from: at > 0 ? { key, segment: at } : undefined });
  };

  const tapReads = tappable && (tapToStart || segment !== null);
  const known = (start: number, end: number) =>
    Boolean(marks?.some((mark) => mark.start < end && start < mark.end));

  return (
    <span
      ref={containerRef}
      data-spoken-text=""
      data-spoken-tap={tapReads ? "" : undefined}
      data-long-press={onLongPressWord ? "" : undefined}
      onClick={onClick}
      {...longPress}
      className={className}
    >
      {segment === null
        ? ruby?.length
          ? <RubyRange segments={ruby} />
          : marks?.length
          ? markedRuns(text, marks).map((run) =>
              run.known ? (
                <span key={run.start} className="known-word" data-known="">{run.text}</span>
              ) : (
                <Fragment key={run.start}>{run.text}</Fragment>
              ),
            )
          : text
        : segmentSpoken(text, lang).map((part, index) =>
            index === segment ? (
              <mark
                key={part.start}
                className={`spoken-now${known(part.start, part.end) ? " known-word" : ""}`}
                data-spoken-now=""
                data-segment={index}
              >
                {ruby?.length ? <RubyRange segments={ruby} start={part.start} end={part.end} /> : part.text}
              </mark>
            ) : (
              <span
                key={part.start}
                data-segment={index}
                className={part.word && known(part.start, part.end) ? "known-word" : undefined}
                data-known={part.word && known(part.start, part.end) ? "" : undefined}
              >
                {ruby?.length ? <RubyRange segments={ruby} start={part.start} end={part.end} /> : part.text}
              </span>
            ),
          )}
    </span>
  );
}

/**
 * A word's reading (zhuyin, pinyin, IPA), lit with the word. For a Chinese
 * word said a character at a time, the syllable of the character being said;
 * for any other, the whole reading while the word sounds.
 */
export function SpokenReading({ reading, text, lang }: { reading: string; text: string; lang: SpeechLanguage }) {
  const segment = useSpokenSegment(spokenKey(text, lang));
  if (segment === null || segment < 0) return <>{reading}</>;

  const syllables = reading.trim().split(/\s+/);
  if (isCharByChar(text, lang) && syllables.length === Array.from(text).length) {
    return (
      <>
        {syllables.map((syllable, index) => (
          <Fragment key={index}>
            {index > 0 ? " " : ""}
            {index === segment ? (
              <mark className="spoken-now" data-spoken-now="">{syllable}</mark>
            ) : (
              syllable
            )}
          </Fragment>
        ))}
      </>
    );
  }

  return <mark className="spoken-now" data-spoken-now="">{reading}</mark>;
}

/**
 * Something shown for a text that is said differently from how it is
 * written (a sound's symbol, a phrase marked for stress), lit whole while
 * that text sounds.
 */
export function SpokenMark({ text, lang, children }: { text: string; lang: SpeechLanguage; children: ReactNode }) {
  const segment = useSpokenSegment(spokenKey(text, lang));
  if (segment === null || segment < 0) return <>{children}</>;
  return <mark className="spoken-now" data-spoken-now="">{children}</mark>;
}

/** The reader's word-by-word switch: one, for the whole app, kept on this device. */
export function useWordByWord(): boolean {
  return useSyncExternalStore(subscribeToWordByWord, getWordByWord, getServerWordByWord);
}

/**
 * Says every sentence one word at a time, with a pause between (Chi,
 * 2026-11-13, for the lookup card's example; 2026-11-14, one switch for the
 * whole app, offered beside every block of sentences).
 */
export function WordByWordSwitch({ tone, className = "" }: { tone?: "warm" | "cosmic"; className?: string }) {
  const { t } = useTranslation();
  const on = useWordByWord();
  const cosmicMode = useCosmicMode();
  const cosmic = (tone ?? (cosmicMode ? "cosmic" : "warm")) === "cosmic";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={(event) => {
        event.stopPropagation();
        stopSpoken();
        setWordByWord(!on);
      }}
      className={`flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[0.6875rem] font-semibold transition-colors ${
        on
          ? cosmic
            ? "border-[var(--cosmic-cyan)] text-[var(--cosmic-cyan)]"
            : "border-black bg-black text-white"
          : cosmic
            ? "border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
            : "border-black/15 bg-white text-ink-soft"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative h-3.5 w-6 rounded-full transition-colors ${
          on ? "bg-white/35" : "bg-black/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-[left] ${
            on ? "left-3 bg-white" : "left-0.5 bg-white"
          }`}
        />
      </span>
      {t.common.wordByWord}
    </button>
  );
}
