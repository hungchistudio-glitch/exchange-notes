import {
  getSpeechSettings,
  speak,
  stopSpeech,
  type SpeechLanguage,
} from "@/lib/speech";

/* =========================================================
   Which word is being said right now

   A first reader asked for two things of the speaker keys (Chi, 2026-11-13):
   to see each word lit as it is said, and a way to hear a sentence one word
   at a time. Both need the same fact — which word of which text is sounding
   — so it lives here, once, and the key and the text it reads both watch it.

   One text sounds at a time (speak() cancels whatever was playing), so the
   state is one value: the key of the text playing and the index of the
   segment lit, or null when nothing is.

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
  key: string;
  /** The lit segment, or -1 before the first word has started. */
  segment: number;
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

/** Characters the estimate treats as a syllable each: CJK, kana, hangul. */
const SYLLABIC = /[぀-ヿ㐀-鿿가-힯豈-﫿]/;

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

function clearEstimate() {
  if (estimateTimer !== null) {
    window.clearTimeout(estimateTimer);
    estimateTimer = null;
  }
  if (wordTimer !== null) {
    window.clearTimeout(wordTimer);
    wordTimer = null;
  }
}

function finish(own: number) {
  if (own !== run) return;
  clearEstimate();
  set(null);
}

export type PlaySpokenOptions = {
  /** Names this text, for the key and the text that both watch it. */
  key: string;
  text: string;
  lang: SpeechLanguage;
  /** One word at a time, each its own utterance, with WORD_PAUSE_MS between. */
  wordByWord?: boolean;
};

export function playSpoken({ key, text, lang, wordByWord = false }: PlaySpokenOptions): void {
  if (typeof window === "undefined") return;

  const own = ++run;
  clearEstimate();

  const segments = segmentWords(text, lang);
  const words = segments.flatMap((segment, index) => (segment.word ? [index] : []));

  set({ key, segment: -1 });

  if (wordByWord && words.length > 1) {
    const wordRate = (getSpeechSettings().rate || 1) * WORD_BY_WORD_RATE;
    let position = 0;

    /* The next word: lit, said, and on its end (or, if the engine never
       says it has ended, a little after it should have) the pause, then
       the one after it. The first is said inside the tap, which is what
       lets an iPhone say the rest from its callbacks. */
    const sayNext = () => {
      if (own !== run) return;
      if (position >= words.length) {
        finish(own);
        return;
      }
      const index = words[position];
      position += 1;
      let moved = false;
      const onward = () => {
        if (moved || own !== run) return;
        moved = true;
        if (wordTimer !== null) window.clearTimeout(wordTimer);
        wordTimer = window.setTimeout(sayNext, WORD_PAUSE_MS);
      };

      set({ key, segment: index });
      speak(segments[index].text, lang, { onEnd: onward, onError: onward }, wordRate);
      if (wordTimer !== null) window.clearTimeout(wordTimer);
      wordTimer = window.setTimeout(
        onward,
        estimateWordMs(segments[index].text) / wordRate + WORD_END_GRACE_MS,
      );
    };

    sayNext();
    return;
  }

  let heardBoundary = false;
  const rate = getSpeechSettings().rate || 1;

  /* Walks the words on a clock until a real boundary arrives or speech ends. */
  const walk = (position: number) => {
    if (own !== run || heardBoundary || position >= words.length) return;
    const index = words[position];
    set({ key, segment: index });
    estimateTimer = window.setTimeout(
      () => walk(position + 1),
      estimateWordMs(segments[index].text) / rate,
    );
  };

  speak(text, lang, {
    onStart: () => {
      if (own !== run) return;
      walk(0);
    },
    onBoundary: (charIndex) => {
      if (own !== run) return;
      heardBoundary = true;
      clearEstimate();
      const index = segmentAt(segments, charIndex);
      if (index >= 0) set({ key, segment: index });
    },
    onEnd: () => finish(own),
    onError: () => finish(own),
  });
}

/** Stops whatever is being said, and unlights its word. */
export function stopSpoken(): void {
  run += 1;
  clearEstimate();
  stopSpeech();
  set(null);
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
