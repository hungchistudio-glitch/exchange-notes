"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  RotateCcw,
  Volume2,
} from "lucide-react";

import Screen from "@/components/foundation/layout/Screen";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import {
  englishLetters,
  type EnglishCategory,
  type EnglishLetter,
  type LetterSoundValue,
} from "@/lib/pronunciation/englishSounds";
import {
  zhuyinSounds,
  type ZhuyinCategory,
  type ZhuyinSound,
} from "@/lib/pronunciation/zhuyinSounds";
import { playAudio, stopSpeech } from "@/lib/pronunciation/playback";
import { speak } from "@/lib/speech";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import YumiFace from "@/components/pronunciation/YumiFace";
import {
  deriveRigPose,
  type PhoneticFeatures,
  type YumiAnimationState,
  type YumiRigPose,
} from "@/lib/pronunciation/yumiRig";
import { deriveTeachingSteps, type TeachingStepKey } from "@/lib/pronunciation/teachingSteps";
import { highlightEnglishExample, highlightZhuyinExample } from "@/lib/pronunciation/exampleHighlight";
import { recordPracticePlay } from "@/lib/pronunciation/practiceRepository";
import { createClient } from "@/lib/supabase/client";

type Mode = "english" | "zhuyin";
type PlaybackPhase = "loading" | "playing" | "done" | "error";
// `cardKey` (e.g. "english-p") ties a playback sequence back to the card
// that started it, purely so it can be cancelled if that card scrolls out
// of the center reading band mid-playback (brief section 13: "卡片離開中央
// 區域 → 停止音訊") — see the activeCardKey effect below.
type PlaybackState = { key: string; phase: PlaybackPhase; cardKey: string } | null;
type PronunciationCopy = TranslationDictionary["pronunciation"];

function toYumiPhase(phase: PlaybackPhase | undefined): YumiAnimationState {
  switch (phase) {
    case "loading":
      return "preparing";
    case "playing":
      return "articulating";
    case "done":
      return "completed";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

// Timing for the "sound → pause → sound again" sequence (section 2 of the
// redesign brief) — long enough to read as two distinct repetitions rather
// than a stutter, short enough that the whole sequence stays snappy.
const PAUSE_BETWEEN_REPEATS_MS = 320;
const DONE_HOLD_MS = 700;

// Most Zhuyin initials sit fairly close to a relaxed jaw/lip position to
// begin with — Mandarin consonants distinguish themselves mostly by tongue
// placement, not by mouth shape — so YumiFace's default teaching-emphasis
// multiplier read as barely-there movement here. Boosted specifically for
// Zhuyin per user request; English keeps YumiFace's own default.
const ZHUYIN_MOUTH_EMPHASIS = 1.9;

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlaybackIcon({ phase }: { phase?: PlaybackPhase }) {
  if (phase === "loading") {
    return <LoaderCircle size={15} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />;
  }
  if (phase === "playing") {
    return <Volume2 size={15} strokeWidth={1.8} className="animate-pulse" aria-hidden="true" />;
  }
  if (phase === "done") {
    return <Check size={15} strokeWidth={2.2} aria-hidden="true" />;
  }
  if (phase === "error") {
    return <RotateCcw size={15} strokeWidth={1.8} aria-hidden="true" />;
  }
  return <Volume2 size={15} strokeWidth={1.8} aria-hidden="true" />;
}

function ariaLabelFor(base: string, phase: PlaybackPhase | undefined, copy: PronunciationCopy) {
  return phase === "error" ? copy.cards.playbackFailed : base;
}

function playbackButtonClass(phase: PlaybackPhase | undefined) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors";

  if (phase === "error") return `${base} border-red-300 bg-red-50 text-red-600`;
  if (phase === "done") return `${base} border-emerald-300 bg-emerald-50 text-emerald-700`;
  if (phase === "playing") return `${base} border-black bg-black text-white`;
  if (phase === "loading") return `${base} border-line bg-white text-black/70`;
  return `${base} border-line text-black`;
}

const ENGLISH_FILTERS: { value: "all" | EnglishCategory; labelKey: "all" | "vowels" | "consonants" }[] = [
  { value: "all", labelKey: "all" },
  { value: "vowel", labelKey: "vowels" },
  { value: "consonant", labelKey: "consonants" },
];

const ZHUYIN_FILTERS: { value: "all" | ZhuyinCategory; labelKey: "all" | "initial" | "medial" | "final" }[] = [
  { value: "all", labelKey: "all" },
  { value: "initial", labelKey: "initial" },
  { value: "medial", labelKey: "medial" },
  { value: "final", labelKey: "final" },
];

function zhuyinCategoryLabel(category: ZhuyinCategory, copy: PronunciationCopy) {
  if (category === "initial") return copy.filters.initial;
  if (category === "medial") return copy.filters.medial;
  return copy.filters.final;
}

function stepLabel(key: TeachingStepKey, copy: PronunciationCopy) {
  if (key === "mouth") return copy.yumi.mouth;
  if (key === "tongue") return copy.yumi.tongue;
  if (key === "airflow") return copy.yumi.airflow;
  return copy.yumi.voice;
}

function highlightedWord(
  word: string,
  span: { before: string; match: string; after: string } | null,
) {
  if (!span) return word;
  return (
    <>
      {span.before}
      <span className="font-semibold text-black underline decoration-2 underline-offset-2">
        {span.match}
      </span>
      {span.after}
    </>
  );
}

export default function PronunciationLabPage() {
  const { t, language } = useTranslation();
  const copy = t.pronunciation;
  const { learningLanguage } = useLearningLanguageContext();

  // Defaults to whichever language the user is actually learning (section 1
  // of the brief: "Learning language 決定主要學習內容") but stays a plain
  // user override once they tap the other Focus tab themselves — `mode`
  // starts null so the very first render can pick the default from
  // learningLanguage without needing an effect to sync it in afterwards.
  //
  // That only actually holds through the context, which the protected layout
  // seeds from the profile server-side. The hook this used to call started
  // every render at English and fetched afterwards, so a Chinese learner got
  // one frame of the English tab before it swapped to zhuyin.
  const [mode, setMode] = useState<Mode | null>(null);
  const resolvedMode: Mode = mode ?? (learningLanguage === "traditional-chinese" ? "zhuyin" : "english");

  const [englishFilter, setEnglishFilter] = useState<"all" | EnglishCategory>("all");
  const [zhuyinFilter, setZhuyinFilter] = useState<"all" | ZhuyinCategory>("all");

  // Letters like C/G/S/X/Y carry more than one common sound (hard/soft C,
  // etc.) — this tracks which one is currently showing per letter. Only
  // letters the user has actually switched get an entry; everyone else
  // just uses commonSounds[0] (selectedSoundFor below).
  const [selectedSoundByLetter, setSelectedSoundByLetter] = useState<Record<string, string>>({});

  // Defaults to `primarySoundId` — the sound actually embedded in the
  // letter's own name (see the field comment in englishSounds.ts) — rather
  // than just commonSounds[0], so the card's default view (IPA/KK caption,
  // "How to say it", Yumi's mouth/tongue demo) matches what Yumi's audio
  // actually says before the user has touched the pill switcher at all.
  function selectedSoundFor(letter: EnglishLetter): LetterSoundValue {
    const chosenId = selectedSoundByLetter[letter.id] ?? letter.primarySoundId;
    return (
      letter.commonSounds.find((sound) => sound.id === chosenId) ?? letter.commonSounds[0]
    );
  }

  const [expandedGuidance, setExpandedGuidance] = useState<Set<string>>(new Set());
  const [expandedTrap, setExpandedTrap] = useState<Set<string>>(new Set());

  const [playback, setPlayback] = useState<PlaybackState>(null);
  const playTokenRef = useRef(0);
  // Tracks whether the *current* playback's card has ever actually been the
  // centered/active card — see the auto-stop effect below.
  const playbackWasActiveRef = useRef(false);

  // Brief section 13: stop audio immediately if the app/tab goes to the
  // background — nothing should keep talking once the user isn't looking
  // at the screen.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        playTokenRef.current += 1;
        stopSpeech();
        setPlayback(null);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ── Yumi Teaching Stage: which card is "active" ──────────────────
  // Only the card the user is actually reading gets a live, animated Yumi
  // (section 1/9/10 of the brief) — everything else stays a static,
  // unmounted placeholder. `activeCardKey` is the single source of truth
  // for that; TeachingStage below reads it to decide whether to mount
  // <YumiFace> at all.
  //
  // "Active" = closest card to the vertical center of the viewport among
  // whichever cards are currently intersecting the center ~60% reading
  // band, held for a short dwell so fast scrolling doesn't flicker Yumi
  // from card to card (section 10: "卡片需在中央停留約 300–500ms，才正式
  // 啟動 Yumi"). Recomputing "closest to center" from all tracked cards on
  // every observer callback (rather than trusting a single entry) is what
  // makes this behave like a proper scroll-spy instead of just "first
  // thing that crossed a threshold."
  const cardElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellCandidateRef = useRef<string | null>(null);
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);

  const registerCardRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      const map = cardElsRef.current;
      const previous = map.get(key);

      if (previous && previous !== el) {
        observerRef.current?.unobserve(previous);
        map.delete(key);
      }

      if (el) {
        map.set(key, el);
        observerRef.current?.observe(el);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const recomputeActiveCandidate = () => {
      const viewportCenter = window.innerHeight / 2;
      const bandTop = window.innerHeight * 0.2;
      const bandBottom = window.innerHeight * 0.8;

      let bestKey: string | null = null;
      let bestDistance = Infinity;

      cardElsRef.current.forEach((el, key) => {
        const rect = el.getBoundingClientRect();
        const withinBand = rect.top < bandBottom && rect.bottom > bandTop;
        if (!withinBand) return;

        const elCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elCenter - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestKey = key;
        }
      });

      const candidate = bestKey;
      if (candidate === dwellCandidateRef.current) return;

      dwellCandidateRef.current = candidate;
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);

      // Nothing in the center band — let the outgoing card play its exit
      // animation instead of snapping Yumi away instantly.
      dwellTimerRef.current = setTimeout(
        () => setActiveCardKey(candidate),
        candidate ? 350 : 150,
      );
    };

    const observer = new IntersectionObserver(recomputeActiveCandidate, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    observerRef.current = observer;
    cardElsRef.current.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, []);

  // Brief section 13: "卡片離開中央區域 → 停止音訊 → 取消尚未完成的動畫" —
  // once a card has actually been the centered/active one and audio is
  // playing on it, scrolling it out of the center band cuts that audio off
  // rather than letting it keep playing from off-screen. Bumping the shared
  // token invalidates any in-flight runSteps() sequence for it too.
  //
  // This must NOT fire just because `playback.cardKey !== activeCardKey` —
  // every card's speaker/example buttons are tappable regardless of
  // whether that card happens to be the one "active" for the Yumi teaching
  // stage (activeCardKey only reflects scroll-spy centering, on a ~350ms
  // dwell). Cancelling on that mismatch alone killed audio the instant
  // ANY of the following happened: tapping a button on a card that's
  // visible but not exactly centered, or tapping anything before the
  // scroll-spy's dwell timer had set an activeCardKey at all (e.g. the
  // very first tap right after the page loads, when activeCardKey is
  // still null). That reads as "every sound is wrong/cuts off/does
  // nothing" regardless of what text or audio the button actually points
  // at — a real bug found while investigating the letter-name pronunciation
  // reports, independent of and in addition to those data-level fixes.
  //
  // playbackWasActiveRef tracks whether the *current* playback's card has
  // ever actually been activeCardKey; only once that's true does a later
  // mismatch (the card scrolling away) count as "left the center area."
  useEffect(() => {
    if (!playback) {
      playbackWasActiveRef.current = false;
      return;
    }

    if (playback.cardKey === activeCardKey) {
      playbackWasActiveRef.current = true;
      return;
    }

    if (playbackWasActiveRef.current) {
      playTokenRef.current += 1;
      stopSpeech();
      queueMicrotask(() => setPlayback(null));
      playbackWasActiveRef.current = false;
    }
  }, [activeCardKey, playback]);

  function toggleSet(setter: typeof setExpandedGuidance, id: string) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function phaseFor(key: string): PlaybackPhase | undefined {
    return playback?.key === key ? playback.phase : undefined;
  }

  function beginPlayback(key: string, cardKey: string) {
    const token = ++playTokenRef.current;
    setPlayback({ key, phase: "loading", cardKey });
    return token;
  }

  // Each step owns its own key. Every playable sequence in this file (main
  // speaker, an example word, Compare's reference-then-recording run) now
  // only ever touches ONE key throughout — but keeping steps individually
  // keyed still matters for `runSteps`' loading/playing/done/error state
  // machine below, and keeps this shape available if a future sequence
  // ever legitimately needs to span more than one playable thing.
  type Step = { key: string; run: () => Promise<void> };

  async function runSteps(token: number, steps: Step[], cardKey: string) {
    let lastKey = steps[0]?.key;

    try {
      for (const step of steps) {
        if (playTokenRef.current !== token) return;
        lastKey = step.key;
        await step.run();
      }

      if (playTokenRef.current === token && lastKey) {
        setPlayback({ key: lastKey, phase: "done", cardKey });
        window.setTimeout(() => {
          if (playTokenRef.current === token) setPlayback(null);
        }, DONE_HOLD_MS);
      }
    } catch {
      if (playTokenRef.current === token && lastKey) {
        setPlayback({ key: lastKey, phase: "error", cardKey });
      }
    }
  }

  function speakStep(
    token: number,
    key: string,
    text: string,
    lang: "en-US" | "zh-TW",
    cardKey: string,
  ): Step {
    return {
      key,
      run: () =>
        new Promise<void>((resolve, reject) => {
          speak(text, lang, {
            onStart: () => {
              if (playTokenRef.current === token) setPlayback({ key, phase: "playing", cardKey });
            },
            onEnd: () => resolve(),
            onError: () => reject(new Error("speech-failed")),
          });
        }),
    };
  }

  function audioStep(
    token: number,
    key: string,
    src: string | undefined,
    fallbackText: string,
    fallbackLang: "zh-TW" | "en-US",
    cardKey: string,
  ): Step {
    return {
      key,
      run: () =>
        new Promise<void>((resolve, reject) => {
          const markPlaying = () => {
            if (playTokenRef.current === token) setPlayback({ key, phase: "playing", cardKey });
          };

          playAudio(src, {
            onStart: markPlaying,
            onEnd: () => resolve(),
            fallback: () => {
              speak(fallbackText, fallbackLang, {
                onStart: markPlaying,
                onEnd: () => resolve(),
                onError: () => reject(new Error("speech-failed")),
              });
            },
            onMissing: () => {
              speak(fallbackText, fallbackLang, {
                onStart: markPlaying,
                onEnd: () => resolve(),
                onError: () => reject(new Error("speech-failed")),
              });
            },
          });
        }),
    };
  }

  function pauseStep(key: string, ms: number): Step {
    return { key, run: () => new Promise<void>((resolve) => setTimeout(resolve, ms)) };
  }

  function playExampleWord(key: string, text: string, lang: "en-US" | "zh-TW", cardKey: string) {
    const token = beginPlayback(key, cardKey);
    void runSteps(token, [speakStep(token, key, text, lang, cardKey)], cardKey);
  }

  // The card's ONE primary playback trigger, now owned entirely by the Yumi
  // teaching stage (tapping anywhere in that box) rather than a separate
  // top-right speaker button.
  //
  // This intentionally does NOT speak `sound.soundText` (the currently
  // selected pill's word, e.g. "say" for Long A) — tried that, and it read
  // as the wrong pronunciation: tapping the A card said "say" instead of
  // just "A". Confirmed with the user this must stay simple: A says A, B
  // says B, regardless of which pill is selected. The pill switcher and its
  // sound-specific audio/mouth/tongue/guidance/examples still work exactly
  // as before via `sound` in the surrounding JSX — only THIS button is
  // pinned to the bare letter name.
  //
  // Speaks the LOWERCASE character, not `letter.letter` (which is uppercase
  // for display). Several TTS voices treat a bare uppercase single
  // character as a request to announce its case for disambiguation —
  // reading "A" back as "capital A" — the same accessibility behavior
  // screen readers use so users can tell "A" apart from "a". Lowercase
  // doesn't trigger that.
  function playEnglishPrimary(letter: EnglishLetter) {
    const cardKey = `english-${letter.id}`;
    const mainKey = `en-main-${letter.id}`;
    const token = beginPlayback(mainKey, cardKey);
    const soundText = letter.letter.toLowerCase();

    const steps: Step[] = [
      speakStep(token, mainKey, soundText, "en-US", cardKey),
      pauseStep(mainKey, PAUSE_BETWEEN_REPEATS_MS),
      speakStep(token, mainKey, soundText, "en-US", cardKey),
    ];

    void runSteps(token, steps, cardKey);
    void recordPracticePlay(createClient(), "english", letter.id);
  }

  function playZhuyinMain(sound: ZhuyinSound) {
    const cardKey = `zhuyin-${sound.id}`;
    const mainKey = `zh-main-${sound.id}`;
    const token = beginPlayback(mainKey, cardKey);

    const steps: Step[] = [
      audioStep(token, mainKey, sound.audio, sound.soundText, "zh-TW", cardKey),
      pauseStep(mainKey, PAUSE_BETWEEN_REPEATS_MS),
      audioStep(token, mainKey, sound.audio, sound.soundText, "zh-TW", cardKey),
    ];

    void runSteps(token, steps, cardKey);
    void recordPracticePlay(createClient(), "zhuyin", sound.id);
  }

  const filteredEnglish = useMemo(
    () =>
      englishLetters
        .filter((letter) => englishFilter === "all" || letter.category === englishFilter)
        // Plain A-to-Z — with a letter per card instead of a phoneme per
        // card, alphabetical order is just the alphabet, vowels and
        // consonants interleaved as they naturally fall.
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id)),
      [englishFilter],
  );

  const filteredZhuyin = useMemo(
    () =>
      zhuyinSounds.filter(
        (sound) => zhuyinFilter === "all" || sound.category === zhuyinFilter,
      ),
      [zhuyinFilter],
  );

  return (
    <Screen>
      <div
        className="px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <Link
          href="/"
          aria-label={copy.backHome}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.04]"
        >
          <BackIcon />
        </Link>

        <h1 className="mt-3 text-[26px] font-bold tracking-[-0.02em]">
          {copy.title}
        </h1>
        <p className="mt-1 text-ink-soft">{copy.subtitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-line bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("english")}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              resolvedMode === "english" ? "bg-black text-white" : "text-ink-soft"
            }`}
          >
            {copy.modes.english}
          </button>
          <button
            type="button"
            onClick={() => setMode("zhuyin")}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              resolvedMode === "zhuyin" ? "bg-black text-white" : "text-ink-soft"
            }`}
          >
            {copy.modes.zhuyin}
          </button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(resolvedMode === "english" ? ENGLISH_FILTERS : ZHUYIN_FILTERS).map(
            (filter) => {
              const active =
                resolvedMode === "english"
                  ? englishFilter === filter.value
                  : zhuyinFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() =>
                    resolvedMode === "english"
                      ? setEnglishFilter(filter.value as "all" | EnglishCategory)
                      : setZhuyinFilter(filter.value as "all" | ZhuyinCategory)
                  }
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-line bg-white text-black/60"
                  }`}
                >
                  {copy.filters[filter.labelKey]}
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 px-4 pb-4 md:grid-cols-2">
        {resolvedMode === "english"
          ? filteredEnglish.map((letter) => {
              const cardKey = `english-${letter.id}`;
              const sound = selectedSoundFor(letter);
              const practiceId = `${letter.id}-${sound.id}`;
              const mainKey = `en-main-${letter.id}`;
              const mainPhase = phaseFor(mainKey);
              const guidanceOpen = expandedGuidance.has(practiceId);
              const hasMultipleSounds = letter.commonSounds.length > 1;

              return (
                <div
                  key={letter.id}
                  ref={registerCardRef(cardKey)}
                  className="rounded-[24px] border border-line bg-white p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                      {letter.letter}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        {letter.category === "vowel" ? copy.filters.vowels : copy.filters.consonants}
                      </p>
                      <p className="text-[17px] font-bold">
                        {letter.letter}
                        <span className="font-phonetic ml-1.5 text-sm font-medium text-ink-faint">
                          {letter.letterName.kk}
                        </span>
                      </p>
                    </div>
                  </div>

                  {hasMultipleSounds ? (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        {copy.cards.moreSounds}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {letter.commonSounds.map((value) => (
                          <button
                            key={value.id}
                            type="button"
                            onClick={() =>
                              setSelectedSoundByLetter((current) => ({ ...current, [letter.id]: value.id }))
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                              sound.id === value.id
                                ? "border-black bg-black text-white"
                                : "border-line bg-white text-black/60"
                            }`}
                          >
                            {value.label[language]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <p className="font-phonetic mt-2 text-xs text-ink-faint">
                    {sound.ipa} · {copy.cards.kk} {sound.kk}
                  </p>

                  <TeachingStage
                    active={activeCardKey === cardKey}
                    pose={deriveRigPose(sound.phonetics)}
                    phonetics={sound.phonetics}
                    mainPhase={mainPhase}
                    copy={copy}
                    language={language}
                    onPlayMain={() => playEnglishPrimary(letter)}
                  />

                  <div className="mt-3 rounded-2xl bg-surface p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      {copy.cards.howToSayIt}
                    </p>

                    <div className="mt-2 space-y-1.5">
                      {sound.guidance.map((point, index) => (
                        <p key={index} className="flex gap-2 text-sm leading-6 text-black/70">
                          <span className="font-cjk shrink-0 font-semibold text-ink-soft">
                            {point.label[language]}
                          </span>
                          <span className="font-cjk">{point.text[language]}</span>
                        </p>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSet(setExpandedGuidance, practiceId)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft"
                    >
                      {guidanceOpen ? copy.cards.showLessGuidance : copy.cards.showMoreGuidance}
                      {guidanceOpen ? (
                        <ChevronUp size={13} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
                      )}
                    </button>

                    {guidanceOpen ? (
                      <p className="font-cjk mt-2 text-sm leading-6 text-black/60">{sound.tip[language]}</p>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {sound.examples.map((example, index) => {
                      const key = `en-ex-${practiceId}-${index}`;
                      const phase = phaseFor(key);
                      const span = highlightEnglishExample(example, sound.id);

                      return (
                        <button
                          key={example}
                          type="button"
                          onClick={() => playExampleWord(key, example, "en-US", cardKey)}
                          aria-label={ariaLabelFor(
                            copy.cards.playWord.replace("{word}", example),
                            phase,
                            copy,
                          )}
                          className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-2.5 text-left text-sm font-medium"
                        >
                          <span>{highlightedWord(example, span)}</span>
                          <span className={playbackButtonClass(phase)} aria-hidden="true">
                            <PlaybackIcon phase={phase} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          : filteredZhuyin.map((sound) => {
              const cardKey = `zhuyin-${sound.id}`;
              const mainKey = `zh-main-${sound.id}`;
              const mainPhase = phaseFor(mainKey);
              const guidanceOpen = expandedGuidance.has(sound.id);
              const trapOpen = expandedTrap.has(sound.id);

              return (
                <div
                  key={sound.id}
                  ref={registerCardRef(cardKey)}
                  className="rounded-[24px] border border-line bg-white p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                      <span className="font-zhuyin">{sound.symbol}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        {zhuyinCategoryLabel(sound.category, copy)}
                      </p>
                      <p className="font-zhuyin text-[17px] font-bold">{sound.title}</p>
                      <p className="text-xs text-ink-faint">
                        {copy.cards.romanizationHint}: {sound.romanization}
                      </p>
                    </div>
                  </div>

                  <TeachingStage
                    active={activeCardKey === cardKey}
                    pose={deriveRigPose(sound.phonetics)}
                    phonetics={sound.phonetics}
                    mainPhase={mainPhase}
                    copy={copy}
                    language={language}
                    onPlayMain={() => playZhuyinMain(sound)}
                    emphasisScale={ZHUYIN_MOUTH_EMPHASIS}
                  />

                  <div className="mt-3 rounded-2xl bg-surface p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      {copy.cards.pronunciationMethod}
                    </p>

                    <div className="mt-2 space-y-1.5">
                      {sound.guidance.map((point, index) => (
                        <p key={index} className="flex gap-2 text-sm leading-6 text-black/70">
                          <span className="font-cjk shrink-0 font-semibold text-ink-soft">
                            {point.label[language]}
                          </span>
                          <span className="font-cjk">{point.text[language]}</span>
                        </p>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSet(setExpandedGuidance, sound.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft"
                    >
                      {guidanceOpen ? copy.cards.showLessGuidance : copy.cards.showMoreGuidance}
                      {guidanceOpen ? (
                        <ChevronUp size={13} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
                      )}
                    </button>

                    {guidanceOpen ? (
                      <p className="font-cjk mt-2 text-sm leading-6 text-black/60">{sound.tip[language]}</p>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {sound.examples.map((example, index) => {
                      const key = `zh-ex-${sound.id}-${index}`;
                      const phase = phaseFor(key);
                      const span = highlightZhuyinExample(example.zhuyin, sound.symbol);

                      return (
                        <button
                          key={example.word}
                          type="button"
                          onClick={() => playExampleWord(key, example.word, "zh-TW", cardKey)}
                          aria-label={ariaLabelFor(
                            copy.cards.playWord.replace("{word}", example.word),
                            phase,
                            copy,
                          )}
                          className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-2.5 text-left text-sm font-medium"
                        >
                          <span className="font-cjk">
                            {example.word}
                            <span className="font-zhuyin ml-2 text-xs text-ink-faint">
                              {span ? (
                                <>
                                  {span.before}
                                  <span className="font-semibold text-black/70">{span.match}</span>
                                  {span.after}
                                </>
                              ) : (
                                example.zhuyin
                              )}
                            </span>
                          </span>
                          <span className={playbackButtonClass(phase)} aria-hidden="true">
                            <PlaybackIcon phase={phase} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {sound.commonMistake ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <button
                        type="button"
                        onClick={() => toggleSet(setExpandedTrap, sound.id)}
                        className="flex w-full items-start justify-between gap-2 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                            {copy.cards.commonMistake}
                          </p>
                          <p className="font-cjk mt-1 text-sm leading-6 text-amber-800">
                            {copy.cards.commonTrapSummary
                              .replace("{symbol}", sound.symbol)
                              .replace("{confusedWith}", sound.commonMistake.confusedWith)}
                          </p>
                        </span>
                        {trapOpen ? (
                          <ChevronUp size={15} strokeWidth={2} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" />
                        ) : (
                          <ChevronDown size={15} strokeWidth={2} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" />
                        )}
                      </button>

                      {trapOpen ? (
                        <div className="mt-2">
                          <p className="font-cjk text-sm leading-6 text-amber-800">
                            {sound.commonMistake.explanation[language]}
                          </p>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {(() => {
                              const correctKey = `zh-trap-correct-${sound.id}`;
                              const confusedKey = `zh-trap-confused-${sound.id}`;
                              const correctPhase = phaseFor(correctKey);
                              const confusedPhase = phaseFor(confusedKey);

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      playExampleWord(
                                        correctKey,
                                        sound.commonMistake!.pair.correct.word,
                                        "zh-TW",
                                        cardKey,
                                      )
                                    }
                                    className="rounded-xl bg-white px-3 py-2 text-left text-xs"
                                  >
                                    <p className="font-semibold text-emerald-700">
                                      {copy.cards.correct}: {sound.symbol}
                                    </p>
                                    <span className="font-cjk mt-0.5 flex items-center gap-1.5">
                                      {sound.commonMistake.pair.correct.word}{" "}
                                      <span className="font-zhuyin">
                                        {sound.commonMistake.pair.correct.zhuyin}
                                      </span>
                                      <PlaybackIcon phase={correctPhase} />
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      playExampleWord(
                                        confusedKey,
                                        sound.commonMistake!.pair.confused.word,
                                        "zh-TW",
                                        cardKey,
                                      )
                                    }
                                    className="rounded-xl bg-white px-3 py-2 text-left text-xs"
                                  >
                                    <p className="font-semibold text-red-700">
                                      {copy.cards.incorrect}: {sound.commonMistake.confusedWith}
                                    </p>
                                    <span className="font-cjk mt-0.5 flex items-center gap-1.5">
                                      {sound.commonMistake.pair.confused.word}{" "}
                                      <span className="font-zhuyin">
                                        {sound.commonMistake.pair.confused.zhuyin}
                                      </span>
                                      <PlaybackIcon phase={confusedPhase} />
                                    </span>
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
      </div>
    </Screen>
  );
}

const YUMI_ENTER_MS = 420;
const YUMI_EXIT_MS = 320;

type TeachingStageProps = {
  active: boolean;
  pose: YumiRigPose;
  phonetics: PhoneticFeatures;
  mainPhase: PlaybackPhase | undefined;
  copy: PronunciationCopy;
  language: InterfaceLanguage;
  onPlayMain: () => void;
  /** Passed straight through to YumiFace — see its own comment. */
  emphasisScale?: number;
};

// The "Yumi Teaching Stage" (brief sections 1-3, 8, 11): replaces the old
// static "Mouth · Tongue · Airflow · Voice" caption row. Only the ACTIVE
// card (passed in from the page's IntersectionObserver) actually mounts
// <YumiFace> — every other card renders this same component but shows a
// plain static placeholder instead, so there's only ever one live animated
// rig on screen at a time no matter how many cards are in the list.
function TeachingStage({
  active,
  pose,
  phonetics,
  mainPhase,
  copy,
  language,
  onPlayMain,
  emphasisScale,
}: TeachingStageProps) {
  const steps = useMemo(() => deriveTeachingSteps(phonetics), [phonetics]);

  const [mounted, setMounted] = useState(active);
  const [lifecycle, setLifecycle] = useState<"idle" | "entering" | "exiting" | "previewing">(
    active ? "entering" : "idle",
  );
  const [everPlayed, setEverPlayed] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const previewedRef = useRef(false);
  const wasActiveRef = useRef(false);

  // Card lifecycle: Hidden → Entering → (first time only) Previewing →
  // Idle, and the mirror on the way out — Exiting, then actually unmount
  // after the fade has had time to play (brief section 11).
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (active) {
      queueMicrotask(() => {
        setMounted(true);
        setLifecycle("entering");
      });

      timers.push(
        setTimeout(() => {
          if (!previewedRef.current) {
            previewedRef.current = true;
            setLifecycle("previewing");
            timers.push(setTimeout(() => setLifecycle("idle"), 900));
          } else {
            setLifecycle("idle");
          }
        }, YUMI_ENTER_MS),
      );
    } else if (wasActiveRef.current) {
      queueMicrotask(() => setLifecycle("exiting"));
      timers.push(setTimeout(() => setMounted(false), YUMI_EXIT_MS));
    }

    wasActiveRef.current = active;
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const rigPhase: YumiAnimationState =
    lifecycle === "entering"
      ? "entering"
      : lifecycle === "exiting"
        ? "exiting"
        : lifecycle === "previewing"
          ? "preparing"
          : toYumiPhase(mainPhase);

  // Steps light up in sequence while Yumi is actually "teaching" — either
  // the one-time silent preview, or a real tap-triggered playback. This is
  // a fixed-cadence approximation rather than true per-phoneme audio
  // timing (see the scope note in lib/pronunciation/yumiRig.ts — there's
  // no forced-aligned audio to sync against), so it holds on the last step
  // briefly after playback ends rather than snapping back instantly.
  useEffect(() => {
    const isTeaching = lifecycle === "previewing" || mainPhase === "loading" || mainPhase === "playing";

    if (!isTeaching) {
      // Setting the same value (-1) when already idle is a no-op React
      // bails out of, so this doesn't need `highlightIndex` as a
      // dependency — keeping it out avoids re-running this effect on
      // every highlight tick.
      const resetTimer = setTimeout(() => setHighlightIndex(-1), 500);
      return () => clearTimeout(resetTimer);
    }

    const totalMs = lifecycle === "previewing" ? 900 : 1800;
    const stepMs = totalMs / steps.length;
    const timers = steps.map((_, index) =>
      setTimeout(() => setHighlightIndex(index), stepMs * index),
    );

    return () => timers.forEach(clearTimeout);
  }, [lifecycle, mainPhase, steps]);

  // The redesign brief is explicit that this whole box — not just the
  // Yumi icon, and not individual step lines — is the card's one primary
  // playback trigger now that the old top-right speaker button is gone.
  // Making it a single <button> wrapping everything (icon + steps) means
  // there's exactly one hit target, sized for a comfortable mobile tap,
  // instead of several small separately-clickable step rows.
  function handleTap() {
    setEverPlayed(true);
    onPlayMain();
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label={copy.yumi.tapToHear}
      className="mt-3 flex w-full flex-col items-center gap-3 rounded-2xl bg-surface p-4 text-center transition-colors active:bg-black/[0.03] md:flex-row md:items-center md:gap-5 md:p-4 md:text-left"
    >
      {/* Yumi herself is now the card's main teaching stage, not a small
          side icon — centered and enlarged on mobile (brief: "手機版可以將
          Yumi 置中放大"), ~38% of the row on wider screens so the mouth/
          tongue stay the easiest thing on the card to actually look at. */}
      <div className="flex shrink-0 justify-center md:w-[38%]">
        {mounted ? (
          <YumiFace
            pose={pose}
            phase={rigPhase}
            size={104}
            label={copy.yumi.demoAriaLabel}
            emphasisScale={emphasisScale}
          />
        ) : (
          <div
            className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-dashed border-line/60 text-ink-faint"
            aria-hidden="true"
          >
            <Volume2 size={22} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="min-w-0 w-full flex-1">
        {active && !everPlayed ? (
          <p className="mb-1.5 text-[11px] font-medium text-ink-faint">{copy.yumi.tapToHear}</p>
        ) : null}

        <div className="space-y-1">
          {steps.map((step, index) => {
            const isCurrent = active && highlightIndex === index;
            return (
              <p
                key={step.key}
                className={`text-sm leading-6 transition-colors ${
                  isCurrent ? "text-black" : "text-ink-faint"
                }`}
              >
                <span
                  className={`mr-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    isCurrent ? "text-black/60" : "text-ink-faint"
                  }`}
                >
                  {stepLabel(step.key, copy)}
                </span>
                <span className="font-cjk">{step.text[language]}</span>
              </p>
            );
          })}
        </div>
      </div>
    </button>
  );
}
