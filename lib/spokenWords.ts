import {
  getSpeechSettings,
  onSpeechStop,
  speak,
  stopSpeech,
  type SpeechCallbacks,
  type SpeechLanguage,
} from "@/lib/speech";

/* =========================================================
   Which word is being said right now

   Every speaker key in the app lights the word it is saying (Chi,
   2026-11-14: 念到哪亮到哪, in every speaker, not only the lookup card's).
   It began with a first reader, who asked to see each word lit as it is
   said and to hear a sentence one word at a time (2026-11-13). Both need the
   same fact, which word of which text is sounding, so it lives here once.
   The key that plays and the text it reads both watch it
   (components/speech/Spoken.tsx).

   One run sounds at a time (speak() cancels whatever was playing). A run is
   one text, or several said one after another: a story's title and then
   its summary. The state is the run's name (for its key), the text whose
   word is lit (for that text), and how far through the run it is.

   Where the word comes from:

   - Word by word: each word is its own utterance, spoken when the last
     one has ended and a short pause has passed, and lit as it is asked
     for. They used to be queued all at once and lit by each one's own
     `start`, which an iPhone does not send for queued utterances: the
     light stayed on the first word (Chi, 2026-11-13).
   - Whole text, on an engine that reports word boundaries (Safari, and the
     local voices of Chrome and Edge): the boundary's character offset.
   - Whole text, on one that does not (Chrome's "Google" cloud voices): an
     estimate, walked from the moment speech starts, at a pace taken from the
     reader's rate and how long each word is. It is replaced by the real
     thing the moment a boundary arrives, and ends when the speech does.
   - A Chinese word on its own (圖書館): one character at a time, each a
     syllable, with its zhuyin and pinyin syllable lit alongside (Chi,
     2026-11-14). An engine reports one boundary for the whole word, so the
     estimate keeps walking and a boundary only moves it on.
   - A recording (the Lab's zhuyin sounds): the estimate, spread over the
     recording's own length.
   ========================================================= */

export type Segment = {
  text: string;
  /** Character offsets into the whole text. */
  start: number;
  end: number;
  /** A word, rather than the space or punctuation between two. */
  word: boolean;
};

export type SpokenState = {
  /** The run's name: what its play key watches. */
  run: string;
  /** The text whose word is lit: what that text watches. */
  key: string;
  /** The lit segment, or -1 before the first word has started. */
  segment: number;
  /** How far through the run, 0 to 1, counted in words. */
  progress: number;
} | null;

let state: SpokenState = null;
const listeners = new Set<() => void>();

function set(next: SpokenState) {
  state = next;
  for (const listener of [...listeners]) listener();
}

export function subscribeToSpoken(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpoken(): SpokenState {
  return state;
}

export function getServerSpoken(): SpokenState {
  return null;
}

/** What a text is called, by the key that says it and the text that shows it. */
export function spokenKey(text: string, lang: SpeechLanguage | string): string {
  return `${lang}:${text}`;
}

/** Characters the estimate treats as a syllable each: CJK, kana, hangul. */
const SYLLABIC = /[぀-ヿ㐀-鿿가-힯豈-﫿]/;

/** A Chinese word or short phrase on its own, with nothing but characters. */
const HAN_TERM = /^\p{Script=Han}{2,8}$/u;

/** Said and lit one character at a time: a Chinese word on its own. */
export function isCharByChar(text: string, lang: SpeechLanguage | string): boolean {
  return lang.startsWith("zh") && HAN_TERM.test(text);
}

/**
 * A text cut into words and what lies between them, by the browser's own
 * word breaker where it has one — which knows that 我們喜歡 is two words, not
 * four characters or one — and at spaces where it does not.
 */
export function segmentWords(text: string, locale: string): Segment[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
      return Array.from(segmenter.segment(text), (part) => ({
        text: part.segment,
        start: part.index,
        end: part.index + part.segment.length,
        word: Boolean(part.isWordLike),
      }));
    } catch {
      /* An unknown locale: fall through to the spaces. */
    }
  }

  const segments: Segment[] = [];
  const pattern = /\S+|\s+/g;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    segments.push({
      text: match[0],
      start,
      end: start + match[0].length,
      word: /\S/.test(match[0]),
    });
  }
  return segments;
}

/** The segments a text is lit by: its characters for a Chinese word, else its words. */
export function segmentSpoken(text: string, lang: SpeechLanguage | string): Segment[] {
  if (!isCharByChar(text, lang)) return segmentWords(text, lang);
  const segments: Segment[] = [];
  let start = 0;
  for (const char of text) {
    segments.push({ text: char, start, end: start + char.length, word: true });
    start += char.length;
  }
  return segments;
}

/** The word segment at a character offset, or the nearest word before it. */
export function segmentAt(segments: readonly Segment[], charIndex: number): number {
  let found = -1;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment.word) continue;
    if (segment.start > charIndex) break;
    found = index;
  }
  return found;
}

/**
 * How long a word takes to say at rate 1, for the estimate: a syllabic
 * script at about four and a half characters a second, everything else at
 * about fourteen letters, and never less than a short beat.
 */
export function estimateWordMs(word: string): number {
  let ms = 0;
  for (const char of word) ms += SYLLABIC.test(char) ? 220 : 70;
  return Math.max(180, ms);
}

/** Slower than the reader's own pace, for one word at a time. */
const WORD_BY_WORD_RATE = 0.85;

/** The pause between two words said one at a time (Chi, 2026-11-13: 0.3s). */
export const WORD_PAUSE_MS = 300;

/** Past a word's own length, how long to wait for an `end` that never comes. */
const WORD_END_GRACE_MS = 1_500;

/* Each play gets its own number, so a callback from speech that has since
   been replaced does nothing. */
let run = 0;
let estimateTimer: number | null = null;
let wordTimer: number | null = null;

function clearTimers() {
  if (estimateTimer !== null) {
    window.clearTimeout(estimateTimer);
    estimateTimer = null;
  }
  if (wordTimer !== null) {
    window.clearTimeout(wordTimer);
    wordTimer = null;
  }
}

/** One text of a run. */
export type SpokenPart = {
  text: string;
  lang: SpeechLanguage;
  /** Defaults to spokenKey(text, lang), which is what SpokenText watches. */
  key?: string;
};

export type PlaySpokenOptions = {
  /** The run's name, for its play key. Defaults to its first text's key. */
  run?: string;
  /** One text… */
  key?: string;
  text?: string;
  lang?: SpeechLanguage;
  /** …or several, said one after another. */
  parts?: SpokenPart[];
  /**
   * One word at a time, each its own utterance, with WORD_PAUSE_MS between.
   * Defaults to the reader's switch (Chi, 2026-11-14: one switch for the
   * whole app). A word on its own is always said whole.
   */
  wordByWord?: boolean;
  /** Start at this word rather than the first: a tapped word. */
  from?: { key: string; segment: number };
  /** The rate, if not the reader's own; per language, if a function. */
  rate?: number | ((lang: SpeechLanguage) => number);
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  /**
   * Another run took over before this one ended, or speech was stopped from
   * elsewhere. A key that keeps its own state (playing, done, failed) goes
   * back to rest on it; the engine's own events cannot be trusted to say so.
   */
  onCancel?: () => void;
};

type Plan = {
  key: string;
  text: string;
  lang: SpeechLanguage;
  segments: Segment[];
  /** The indexes of its word segments, in order. */
  words: number[];
  charByChar: boolean;
};

function planOf(options: PlaySpokenOptions): Plan[] {
  const parts: SpokenPart[] = options.parts
    ?? (options.text !== undefined && options.lang
      ? [{ text: options.text, lang: options.lang, key: options.key }]
      : []);

  return parts.flatMap((part) => {
    if (!part.text.trim()) return [];
    const segments = segmentSpoken(part.text, part.lang);
    const words = segments.flatMap((segment, index) => (segment.word ? [index] : []));
    return [{
      key: part.key ?? spokenKey(part.text, part.lang),
      text: part.text,
      lang: part.lang,
      segments,
      words,
      charByChar: isCharByChar(part.text, part.lang),
    }];
  });
}

/** The run playing now, kept so a tapped word can start it again from there. */
let current: PlaySpokenOptions | null = null;
/** What the run playing now is told if another replaces it. */
let cancelCurrent: (() => void) | null = null;

/** Tells the run playing now that it has been replaced. */
function supersede() {
  const cancel = cancelCurrent;
  cancelCurrent = null;
  cancel?.();
}

function finish(own: number) {
  if (own !== run) return;
  clearTimers();
  current = null;
  cancelCurrent = null;
  set(null);
}

export function playSpoken(options: PlaySpokenOptions): void {
  startRun(options, false);
}

function startRun(options: PlaySpokenOptions, resume: boolean): void {
  if (typeof window === "undefined") return;

  /* A tapped word carries on the same run: nothing it began is replaced. */
  if (!resume) supersede();
  const own = ++run;
  clearTimers();

  const plan = planOf(options);
  if (plan.length === 0) {
    current = null;
    cancelCurrent = null;
    set(null);
    options.onError?.();
    return;
  }
  current = options;
  cancelCurrent = options.onCancel ?? null;

  const runName = options.run ?? plan[0].key;
  const total = Math.max(1, plan.reduce((sum, part) => sum + part.words.length, 0));
  const before = (partIndex: number) =>
    plan.slice(0, partIndex).reduce((sum, part) => sum + part.words.length, 0);
  const rateFor = (lang: SpeechLanguage) => {
    const rate = typeof options.rate === "function" ? options.rate(lang) : options.rate;
    return rate ?? (getSpeechSettings().rate || 1);
  };
  /* The reader's own rate is speak()'s default: only another is passed. */
  const say = (text: string, lang: SpeechLanguage, callbacks: SpeechCallbacks, rate?: number) =>
    rate === undefined && options.rate === undefined
      ? speak(text, lang, callbacks)
      : speak(text, lang, callbacks, rate ?? rateFor(lang));

  const light = (partIndex: number, position: number) => {
    const part = plan[partIndex];
    set({
      run: runName,
      key: part.key,
      segment: part.words[position] ?? -1,
      progress: Math.min(1, (before(partIndex) + position) / total),
    });
  };

  /* Where to begin: the tapped word, or the top. */
  let firstPart = 0;
  let firstWord = 0;
  if (options.from) {
    const at = plan.findIndex((part) => part.key === options.from!.key);
    if (at >= 0) {
      firstPart = at;
      const position = plan[at].words.findIndex((index) => index >= options.from!.segment);
      firstWord = Math.max(0, position);
    }
  }

  set({ run: runName, key: plan[firstPart].key, segment: -1, progress: before(firstPart) / total });

  let started = false;
  const heard = () => {
    if (started) return;
    started = true;
    options.onStart?.();
  };
  const ended = () => {
    if (own !== run) return;
    finish(own);
    options.onEnd?.();
  };
  const failed = () => {
    if (own !== run) return;
    finish(own);
    options.onError?.();
  };

  /** A text whole: lit by its boundaries, or by the estimate until one comes. */
  const sayWhole = (partIndex: number, fromWord: number, onward: () => void) => {
    const part = plan[partIndex];
    const offset = fromWord > 0 ? part.segments[part.words[fromWord]].start : 0;
    const rate = rateFor(part.lang);
    let heardBoundary = false;
    let position = fromWord;

    const walk = (next: number) => {
      if (own !== run || next >= part.words.length) return;
      if (heardBoundary && !part.charByChar) return;
      position = next;
      light(partIndex, next);
      estimateTimer = window.setTimeout(
        () => walk(next + 1),
        estimateWordMs(part.segments[part.words[next]].text) / rate,
      );
    };

    say(
      part.text.slice(offset),
      part.lang,
      {
        onStart: () => {
          if (own !== run) return;
          heard();
          walk(fromWord);
        },
        onBoundary: (charIndex) => {
          if (own !== run) return;
          const at = part.words.indexOf(segmentAt(part.segments, charIndex + offset));
          if (at < 0) return;
          if (part.charByChar) {
            /* One boundary for the whole word: it may only move the walk on. */
            if (at > position) {
              clearTimers();
              walk(at);
            }
            return;
          }
          heardBoundary = true;
          clearTimers();
          position = at;
          light(partIndex, at);
        },
        onEnd: () => {
          if (own !== run) return;
          clearTimers();
          onward();
        },
        onError: failed,
      },
    );
  };

  /* The next word: lit, said, and on its end (or, if the engine never says
     it has ended, a little after it should have) the pause, then the one
     after it. The first is said inside the tap, which is what lets an
     iPhone say the rest from its callbacks. */
  const sayWords = (partIndex: number, fromWord: number, onward: () => void) => {
    const part = plan[partIndex];
    const rate = rateFor(part.lang) * WORD_BY_WORD_RATE;
    let position = fromWord;

    const sayNext = () => {
      if (own !== run) return;
      if (position >= part.words.length) {
        onward();
        return;
      }
      const index = part.words[position];
      const at = position;
      position += 1;
      let moved = false;
      const next = () => {
        if (moved || own !== run) return;
        moved = true;
        if (wordTimer !== null) window.clearTimeout(wordTimer);
        wordTimer = window.setTimeout(sayNext, WORD_PAUSE_MS);
      };

      light(partIndex, at);
      say(part.segments[index].text, part.lang, { onStart: heard, onEnd: next, onError: next }, rate);
      if (wordTimer !== null) window.clearTimeout(wordTimer);
      wordTimer = window.setTimeout(
        next,
        estimateWordMs(part.segments[index].text) / rate + WORD_END_GRACE_MS,
      );
    };

    sayNext();
  };

  const wordByWord = options.wordByWord ?? getWordByWord();

  const sayPart = (partIndex: number, fromWord: number) => {
    if (own !== run) return;
    if (partIndex >= plan.length) {
      ended();
      return;
    }
    const part = plan[partIndex];
    const onward = () => sayPart(partIndex + 1, 0);
    if (wordByWord && !part.charByChar && part.words.length > 1) {
      sayWords(partIndex, fromWord, onward);
    } else {
      sayWhole(partIndex, fromWord, onward);
    }
  };

  sayPart(firstPart, firstWord);
}

/**
 * Starts the run playing now again from a word in one of its texts: a word
 * tapped while it plays. False if no run playing holds that text.
 */
export function playSpokenFrom(key: string, segment: number): boolean {
  const playing = state;
  if (!current || !playing) return false;
  const plan = planOf(current);
  if (!plan.some((part) => part.key === key)) return false;
  startRun({ ...current, run: playing.run, from: { key, segment } }, true);
  return true;
}

/**
 * Lights a recording's text while it plays: by the estimate, spread over
 * the recording's own length once it is known. Returns what takes the
 * light away again, for a recording that is replaced before it ends.
 */
export function followRecording(
  part: SpokenPart,
  audio: HTMLAudioElement,
  onCancel?: () => void,
): () => void {
  supersede();
  const own = ++run;
  clearTimers();
  current = null;
  const [plan] = planOf({ parts: [part] });
  if (!plan) return () => undefined;

  /* Replaced by another key: the recording stops too, one sound at a time. */
  const replaced = () => {
    audio.pause();
    onCancel?.();
  };
  cancelCurrent = replaced;

  const total = Math.max(1, plan.words.length);
  set({ run: plan.key, key: plan.key, segment: -1, progress: 0 });

  const walk = (position: number, stepMs: number) => {
    if (own !== run || position >= plan.words.length) return;
    set({ run: plan.key, key: plan.key, segment: plan.words[position], progress: position / total });
    estimateTimer = window.setTimeout(() => walk(position + 1, stepMs), stepMs);
  };

  const onPlaying = () => {
    const lengthMs = Number.isFinite(audio.duration) && audio.duration > 0
      ? (audio.duration * 1000) / (audio.playbackRate || 1)
      : plan.words.reduce((sum, index) => sum + estimateWordMs(plan.segments[index].text), 0);
    walk(0, lengthMs / total);
  };
  const onDone = () => finish(own);

  audio.addEventListener("playing", onPlaying, { once: true });
  audio.addEventListener("ended", onDone, { once: true });
  audio.addEventListener("error", onDone, { once: true });

  return () => {
    audio.removeEventListener("playing", onPlaying);
    audio.removeEventListener("ended", onDone);
    audio.removeEventListener("error", onDone);
    if (cancelCurrent === replaced) cancelCurrent = null;
    finish(own);
  };
}

/** Stops whatever is being said, and unlights its word. */
export function stopSpoken(): void {
  supersede();
  run += 1;
  clearTimers();
  current = null;
  stopSpeech();
  set(null);
}

/* Speech stopped from anywhere else (a microphone opening, a sheet closing)
   takes the light away too: WebKit sends no event for what it cancels. */
if (typeof window !== "undefined") {
  onSpeechStop(() => {
    supersede();
    if (state === null) return;
    run += 1;
    clearTimers();
    current = null;
    set(null);
  });
}

/* ---------- the word-by-word switch, kept on this device ---------- */

const WORD_BY_WORD_KEY = "speech-word-by-word";
let wordByWord: boolean | null = null;
const wordByWordListeners = new Set<() => void>();

export function getWordByWord(): boolean {
  if (wordByWord === null) {
    try {
      wordByWord = window.localStorage.getItem(WORD_BY_WORD_KEY) === "1";
    } catch {
      wordByWord = false;
    }
  }
  return wordByWord;
}

export function getServerWordByWord(): boolean {
  return false;
}

export function setWordByWord(next: boolean): void {
  wordByWord = next;
  try {
    window.localStorage.setItem(WORD_BY_WORD_KEY, next ? "1" : "0");
  } catch {
    /* Private mode: it holds for this visit. */
  }
  for (const listener of [...wordByWordListeners]) listener();
}

export function subscribeToWordByWord(listener: () => void): () => void {
  wordByWordListeners.add(listener);
  return () => {
    wordByWordListeners.delete(listener);
  };
}
