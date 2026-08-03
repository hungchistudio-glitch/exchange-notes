"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Ear,
  GitCompare,
  LoaderCircle,
  Mic,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";

import Screen from "@/components/foundation/layout/Screen";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLearningLanguage from "@/hooks/preferences/useLearningLanguage";
import {
  englishSounds,
  type EnglishCategory,
  type EnglishSound,
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
import type { LocalizedText } from "@/lib/pronunciation/localizedText";
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
type PracticeStep = "idle" | "countdown" | "recording" | "recorded";
type PracticeState = { key: string; step: PracticeStep; recordingUrl: string | null } | null;

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

function playbackButtonClass(phase: PlaybackPhase | undefined, size: "sm" | "md") {
  const base =
    size === "md"
      ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors"
      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors";

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
  const { learningLanguage } = useLearningLanguage();

  // Defaults to whichever language the user is actually learning (section 1
  // of the brief: "Learning language 決定主要學習內容") but stays a plain
  // user override once they tap the other Focus tab themselves — `mode`
  // starts null so the very first render can pick the default from
  // learningLanguage without needing an effect to sync it in afterwards.
  const [mode, setMode] = useState<Mode | null>(null);
  const resolvedMode: Mode = mode ?? (learningLanguage === "traditional-chinese" ? "zhuyin" : "english");

  const [englishFilter, setEnglishFilter] = useState<"all" | EnglishCategory>("all");
  const [zhuyinFilter, setZhuyinFilter] = useState<"all" | ZhuyinCategory>("all");

  const [expandedGuidance, setExpandedGuidance] = useState<Set<string>>(new Set());
  const [expandedTrap, setExpandedTrap] = useState<Set<string>>(new Set());

  const [playback, setPlayback] = useState<PlaybackState>(null);
  const playTokenRef = useRef(0);

  // Listen → Repeat → Compare (section 6/19 of the brief). Only one card
  // can be "in practice" at a time — recording needs real mic access, so
  // keeping this to a single shared slot avoids ever having two live
  // MediaRecorder streams or juggling which one a Compare tap refers to.
  // Recordings stay as in-memory blob URLs for this pass (not uploaded) —
  // see the practiceRepository.ts comment for why only replay *counts* are
  // persisted, not the audio itself.
  const [practice, setPractice] = useState<PracticeState>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
  // whenever the active card changes (including to nothing), any playback
  // that belongs to a card which is no longer active gets cut off rather
  // than continuing to play from off-screen. Bumping the shared token
  // invalidates any in-flight runSteps() sequence for it too.
  useEffect(() => {
    if (playback && playback.cardKey !== activeCardKey) {
      playTokenRef.current += 1;
      stopSpeech();
      queueMicrotask(() => setPlayback(null));
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
    fallbackLang: "zh-TW",
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

  // Layer 2's play sequence (section 2): the sound alone, a short pause,
  // then the sound again — one clean repetition is enough to imitate, and
  // keeping the sequence to just the symbol's own audio means the main
  // speaker button only ever plays (and only ever visually owns) its own
  // sound. It used to tack on a representative example word at the end,
  // borrowing that word's key for the final step — but that meant tapping
  // the main circle would make a DIFFERENT button (the example row) light
  // up, which read as the main speaker "sharing" its sound with something
  // else. Every speaker now maps to exactly one thing: the main button to
  // the symbol, each example row to its own word.
  //
  // This must speak `soundText` (the short isolated-sound TTS cue, e.g.
  // "buh" for /b/), not `anchor` (a full demo word, e.g. "Baby") — anchor
  // exists only so example-word buttons never collide with the symbol's
  // own audio (see the field comment in englishSounds.ts), it was never
  // meant to BE the symbol's sound. Speaking the anchor here made every
  // consonant card's main speaker say a whole unrelated word twice (e.g.
  // "Baby, baby" for /b/) instead of the actual target sound — which is
  // what was being reported as "wrong"/"unrelated" pronunciation. Zhuyin's
  // playZhuyinMain below already uses soundText correctly; this brings
  // English in line with it.
  function playEnglishMain(sound: EnglishSound) {
    const cardKey = `english-${sound.id}`;
    const mainKey = `en-main-${sound.id}`;
    const token = beginPlayback(mainKey, cardKey);

    const steps: Step[] = [
      speakStep(token, mainKey, sound.soundText, "en-US", cardKey),
      pauseStep(mainKey, PAUSE_BETWEEN_REPEATS_MS),
      speakStep(token, mainKey, sound.soundText, "en-US", cardKey),
    ];

    void runSteps(token, steps, cardKey);
    void recordPracticePlay(createClient(), "english", sound.id);
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

  // ── Practice: Listen → Repeat → Compare ──────────────────────────
  function practiceKeyFor(kind: Mode, id: string) {
    return `${kind}-${id}`;
  }

  function resetPractice() {
    if (practice?.recordingUrl) URL.revokeObjectURL(practice.recordingUrl);
    if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setPractice(null);
    setMicError(null);
  }

  function startRepeat(key: string) {
    if (practice && practice.key !== key) resetPractice();
    setMicError(null);
    setPractice({ key, step: "countdown", recordingUrl: null });

    countdownTimeoutRef.current = setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        recordedChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          stream.getTracks().forEach((track) => track.stop());
          setPractice((current) =>
            current?.key === key ? { ...current, step: "recorded", recordingUrl: url } : current,
          );
        };

        recorder.start();
        setPractice((current) => (current?.key === key ? { ...current, step: "recording" } : current));
      } catch {
        setMicError(copy.practice.micDenied);
        setPractice(null);
      }
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function playCompare(
    kind: Mode,
    sound: EnglishSound | ZhuyinSound,
    key: string,
    recordingUrl: string,
  ) {
    const cardKey = `${kind}-${sound.id}`;
    const token = beginPlayback(key, cardKey);

    const referenceStep: Step =
      kind === "english"
        ? speakStep(token, key, (sound as EnglishSound).soundText, "en-US", cardKey)
        : audioStep(
            token,
            key,
            (sound as ZhuyinSound).audio,
            (sound as ZhuyinSound).soundText,
            "zh-TW",
            cardKey,
          );

    const recordingStep: Step = {
      key,
      run: () =>
        new Promise<void>((resolve) => {
          playAudio(recordingUrl, {
            onStart: () => {
              if (playTokenRef.current === token) setPlayback({ key, phase: "playing", cardKey });
            },
            onEnd: () => resolve(),
            onMissing: () => resolve(),
          });
        }),
    };

    void runSteps(token, [referenceStep, pauseStep(key, 500), recordingStep], cardKey);
  }

  const filteredEnglish = useMemo(
    () =>
      englishSounds
        .filter((sound) => englishFilter === "all" || sound.category === englishFilter)
        // A-to-Z by id (b, ch, d, f, g, h, j, k, l, m, n, ng, p, r, s, sh,
        // t, th, v, w, y, z — digraphs like "ch"/"sh"/"th"/"ng" naturally
        // sort right after their base letter) instead of the previous
        // voiced/unvoiced-pair grouping, which wasn't alphabetical at all.
        // Consonants stay ahead of vowels in the "All" tab either way,
        // since that's already how the two categories are ordered here.
        .slice()
        .sort((a, b) => {
          if (a.category !== b.category) {
            return a.category === "consonant" ? -1 : 1;
          }
          return a.id.localeCompare(b.id);
        }),
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
        <p className="mt-1 text-black/50">{copy.subtitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-line bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("english")}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              resolvedMode === "english" ? "bg-black text-white" : "text-black/50"
            }`}
          >
            {copy.modes.english}
          </button>
          <button
            type="button"
            onClick={() => setMode("zhuyin")}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              resolvedMode === "zhuyin" ? "bg-black text-white" : "text-black/50"
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
          ? filteredEnglish.map((sound) => {
              const cardKey = `english-${sound.id}`;
              const mainKey = `en-main-${sound.id}`;
              const mainPhase = phaseFor(mainKey);
              const guidanceOpen = expandedGuidance.has(sound.id);

              return (
                <div
                  key={sound.id}
                  ref={registerCardRef(cardKey)}
                  className="rounded-[24px] border border-line bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                        {sound.symbol}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">
                          {sound.category === "vowel" ? copy.filters.vowels : copy.filters.consonants}
                        </p>
                        <p className="text-[17px] font-bold">{sound.title}</p>
                        <p className="font-phonetic text-xs text-black/40">{sound.ipa}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => playEnglishMain(sound)}
                      aria-label={ariaLabelFor(
                        copy.cards.playSound.replace("{symbol}", sound.symbol),
                        mainPhase,
                        copy,
                      )}
                      className={playbackButtonClass(mainPhase, "md")}
                    >
                      <PlaybackIcon phase={mainPhase} />
                    </button>
                  </div>

                  <TeachingStage
                    active={activeCardKey === cardKey}
                    pose={deriveRigPose(sound.phonetics)}
                    guidance={sound.guidance}
                    phonetics={sound.phonetics}
                    mainPhase={mainPhase}
                    copy={copy}
                    language={language}
                    onPlayMain={() => playEnglishMain(sound)}
                  />

                  <div className="mt-3 rounded-2xl bg-surface p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40">
                      {copy.cards.howToSayIt}
                    </p>

                    <div className="mt-2 space-y-1.5">
                      {sound.guidance.map((point, index) => (
                        <p key={index} className="flex gap-2 text-sm leading-6 text-black/70">
                          <span className="font-cjk shrink-0 font-semibold text-black/45">
                            {point.label[language]}
                          </span>
                          <span className="font-cjk">{point.text[language]}</span>
                        </p>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSet(setExpandedGuidance, sound.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-black/50"
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
                      const key = `en-ex-${sound.id}-${index}`;
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
                          <span className={playbackButtonClass(phase, "sm")} aria-hidden="true">
                            <PlaybackIcon phase={phase} />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <PracticeRow
                    kind="english"
                    sound={sound}
                    copy={copy}
                    practice={practice}
                    micError={micError}
                    onListen={() => playEnglishMain(sound)}
                    onRepeat={() => startRepeat(practiceKeyFor("english", sound.id))}
                    onStop={stopRecording}
                    onCompare={(recordingUrl) =>
                      playCompare(
                        "english",
                        sound,
                        `practice-compare-${practiceKeyFor("english", sound.id)}`,
                        recordingUrl,
                      )
                    }
                    comparePhase={phaseFor(`practice-compare-${practiceKeyFor("english", sound.id)}`)}
                  />
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                        <span className="font-zhuyin">{sound.symbol}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">
                          {zhuyinCategoryLabel(sound.category, copy)}
                        </p>
                        <p className="font-zhuyin text-[17px] font-bold">{sound.title}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => playZhuyinMain(sound)}
                      aria-label={ariaLabelFor(
                        copy.cards.playSound.replace("{symbol}", sound.symbol),
                        mainPhase,
                        copy,
                      )}
                      className={playbackButtonClass(mainPhase, "md")}
                    >
                      <PlaybackIcon phase={mainPhase} />
                    </button>
                  </div>

                  <TeachingStage
                    active={activeCardKey === cardKey}
                    pose={deriveRigPose(sound.phonetics)}
                    guidance={sound.guidance}
                    phonetics={sound.phonetics}
                    mainPhase={mainPhase}
                    copy={copy}
                    language={language}
                    onPlayMain={() => playZhuyinMain(sound)}
                  />

                  <div className="mt-3 rounded-2xl bg-surface p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40">
                      {copy.cards.pronunciationMethod}
                    </p>

                    <div className="mt-2 space-y-1.5">
                      {sound.guidance.map((point, index) => (
                        <p key={index} className="flex gap-2 text-sm leading-6 text-black/70">
                          <span className="font-cjk shrink-0 font-semibold text-black/45">
                            {point.label[language]}
                          </span>
                          <span className="font-cjk">{point.text[language]}</span>
                        </p>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSet(setExpandedGuidance, sound.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-black/50"
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
                            <span className="font-zhuyin ml-2 text-xs text-black/40">
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
                          <span className={playbackButtonClass(phase, "sm")} aria-hidden="true">
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

                  <PracticeRow
                    kind="zhuyin"
                    sound={sound}
                    copy={copy}
                    practice={practice}
                    micError={micError}
                    onListen={() => playZhuyinMain(sound)}
                    onRepeat={() => startRepeat(practiceKeyFor("zhuyin", sound.id))}
                    onStop={stopRecording}
                    onCompare={(recordingUrl) =>
                      playCompare(
                        "zhuyin",
                        sound,
                        `practice-compare-${practiceKeyFor("zhuyin", sound.id)}`,
                        recordingUrl,
                      )
                    }
                    comparePhase={phaseFor(`practice-compare-${practiceKeyFor("zhuyin", sound.id)}`)}
                  />
                </div>
              );
            })}
      </div>
    </Screen>
  );
}

type PracticeRowProps = {
  kind: Mode;
  sound: EnglishSound | ZhuyinSound;
  copy: PronunciationCopy;
  practice: PracticeState;
  micError: string | null;
  onListen: () => void;
  onRepeat: () => void;
  onStop: () => void;
  onCompare: (recordingUrl: string) => void;
  comparePhase: PlaybackPhase | undefined;
};

// Section 6/19 of the Yumi brief: Listen (reference), Repeat (countdown +
// record via the browser's own MediaRecorder — no paid API), Compare
// (reference then the user's own recording, back to back). No AI scoring —
// hearing your own voice next to the standard pronunciation is already a
// big step, and a fake-precise score would be worse than none.
function PracticeRow({
  kind,
  sound,
  copy,
  practice,
  micError,
  onListen,
  onRepeat,
  onStop,
  onCompare,
  comparePhase,
}: PracticeRowProps) {
  const key = `${kind}-${sound.id}`;
  const isThisPracticing = practice?.key === key;
  const step = isThisPracticing ? practice.step : "idle";
  const canCompare = isThisPracticing && step === "recorded" && Boolean(practice?.recordingUrl);

  return (
    <div className="mt-3 rounded-2xl border border-line p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onListen}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-black/70"
        >
          <Ear size={14} strokeWidth={1.8} aria-hidden="true" />
          {copy.practice.listen}
        </button>

        {step === "recording" ? (
          <button
            type="button"
            onClick={onStop}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 py-2 text-xs font-semibold text-red-600"
          >
            <Square size={14} strokeWidth={1.8} aria-hidden="true" />
            {copy.practice.stop}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRepeat}
            disabled={step === "countdown"}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-black/70 disabled:opacity-50"
          >
            <Mic size={14} strokeWidth={1.8} aria-hidden="true" />
            {copy.practice.repeat}
          </button>
        )}

        <button
          type="button"
          disabled={!canCompare}
          onClick={() => {
            if (canCompare && practice?.recordingUrl) onCompare(practice.recordingUrl);
          }}
          aria-label={ariaLabelFor(copy.practice.compare, comparePhase, copy)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-black/70 disabled:opacity-40"
        >
          <GitCompare size={14} strokeWidth={1.8} aria-hidden="true" />
          <PlaybackIcon phase={comparePhase} />
        </button>
      </div>

      {step === "countdown" ? (
        <p className="mt-2 text-center text-xs text-black/50">{copy.practice.countdownHint}</p>
      ) : null}
      {step === "recording" ? (
        <p className="mt-2 text-center text-xs text-red-600">{copy.practice.recordingHint}</p>
      ) : null}
      {step === "idle" ? (
        <p className="mt-2 text-center text-xs text-black/40">{copy.practice.noRecordingYet}</p>
      ) : null}
      {micError && isThisPracticing ? (
        <p className="mt-2 text-center text-xs text-red-600">{micError}</p>
      ) : null}
    </div>
  );
}

const YUMI_ENTER_MS = 420;
const YUMI_EXIT_MS = 320;

type TeachingStageProps = {
  active: boolean;
  pose: YumiRigPose;
  guidance: { label: LocalizedText; text: LocalizedText }[];
  phonetics: PhoneticFeatures;
  mainPhase: PlaybackPhase | undefined;
  copy: PronunciationCopy;
  language: InterfaceLanguage;
  onPlayMain: () => void;
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
  guidance,
  phonetics,
  mainPhase,
  copy,
  language,
  onPlayMain,
}: TeachingStageProps) {
  const steps = useMemo(() => deriveTeachingSteps(guidance, phonetics), [guidance, phonetics]);

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

  function handleStepTap() {
    setEverPlayed(true);
    onPlayMain();
  }

  return (
    <div className="mt-3 rounded-2xl bg-surface p-3 md:flex md:items-center md:gap-4">
      <div className="flex justify-center md:w-[35%] md:shrink-0">
        {mounted ? (
          <YumiFace pose={pose} phase={rigPhase} size={72} label={copy.yumi.demoAriaLabel} />
        ) : (
          <div
            className="flex h-[60px] w-[60px] items-center justify-center rounded-full border border-dashed border-line/60 text-black/20"
            aria-hidden="true"
          >
            <Volume2 size={18} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="mt-3 min-w-0 flex-1 md:mt-0">
        {active && !everPlayed ? (
          <p className="mb-1.5 text-[11px] font-medium text-black/40">{copy.yumi.tapToHear}</p>
        ) : null}

        <div className="space-y-1">
          {steps.map((step, index) => {
            const isCurrent = active && highlightIndex === index;
            return (
              <button
                key={step.key}
                type="button"
                onClick={handleStepTap}
                aria-label={copy.yumi.replayStep}
                className={`block w-full text-left text-sm leading-6 transition-colors ${
                  isCurrent ? "text-black" : "text-black/35"
                }`}
              >
                <span
                  className={`mr-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    isCurrent ? "text-black/60" : "text-black/30"
                  }`}
                >
                  {stepLabel(step.key, copy)}
                </span>
                <span className="font-cjk">{step.text[language]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
