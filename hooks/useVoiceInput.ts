"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { tidyChinese } from "@/lib/chinese/tidyChinese";
import { useReloadHold } from "@/lib/pwa/reloadHolds";
import { stopSpeech } from "@/lib/speech";
import { isOnline, isWeakSignal, subscribeNetwork } from "@/hooks/useOnline";
import {
  createBandReader,
  levelFromRms,
  meterStream,
  resetVoiceSignal,
  setVoiceDeaf,
  speechPulse,
  voiceStage,
} from "@/lib/voice/signal";

import {
  getRecognitionConstructor,
  type SpeechRecognitionLike,
} from "@/lib/speechRecognition";

// useSyncExternalStore rather than a setState-in-effect: support never
// changes at runtime, and this keeps the server snapshot (false) and the
// client snapshot reconciled by React instead of causing a hydration
// mismatch or an extra render pass.
const emptySubscribe = () => () => {};
const getRecognitionSnapshot = () => getRecognitionConstructor() !== null;
const getRecordingSnapshot = () => canRecord() || getRecognitionConstructor() !== null;
const getServerSnapshot = () => false;

function canRecord() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/*
 * Whether the browser's recogniser can caption a recording without
 * spoiling it.
 *
 * Apple's engine cannot give one page's microphone to two listeners. On
 * iOS 26 and 27 a SpeechRecognition started beside getUserMedia mutes the
 * recording's track within a second or two and keeps it muted (WebKit bug
 * 321436), and a recogniser left dead by a played pronunciation still holds
 * the microphone. The first quick word got through; the next sentence was
 * recorded as silence (Chi, 2026-10-11: "無法重複使用語音辨識"). Every
 * browser on iOS is Apple's engine, whatever its name, so the vendor is the
 * test. There the recording runs alone: no live caption, every word heard.
 */
function recognizerSharesMicrophone() {
  return typeof navigator === "undefined" || navigator.vendor !== "Apple Computer, Inc.";
}

/*
 * Whether dictation, which only listens, can open a meter of its own beside
 * the recogniser so its animation follows the voice (Chi, 2026-11-12: 發聲時
 * 收音動畫並沒反應). Only on a computer's Chromium. Apple's engine mutes one
 * of two listeners (above). Android gives the microphone to one app at a
 * time, and its recogniser runs in Google's app, so a meter the browser
 * opened would leave the dictation hearing silence. Where it cannot, the
 * recogniser's own news of each word moves the animation instead
 * (speechPulse in lib/voice/signal.ts).
 */
function dictationCanMeter() {
  return (
    recognizerSharesMicrophone() &&
    typeof navigator !== "undefined" &&
    !/Android/i.test(navigator.userAgent ?? "") &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    audioContextConstructor() !== null
  );
}

function endRecognition(session: { recognition: SpeechRecognitionLike | null }) {
  try { session.recognition?.stop(); } catch { /* Already ended. */ }
}

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

/*
 * How a recording ends without the reader having to say so.
 *
 * A little over a second of quiet after speech is the pause between one
 * thought and the next, not the breath inside a sentence, which is what the
 * browser's own end-of-speech used to cut on. It was 1.8 seconds, and every
 * one of those milliseconds is spent before anything is sent: Chi found the
 * whole round slow (2026-10-11). A minute is longer than anyone holds a
 * phone up to a stranger. Eight seconds with no speech at all is a
 * microphone pointed at nothing, and uploading that would spend a request
 * on silence.
 */
const SILENCE_END_MS = 1_200;
const NO_SPEECH_MS = 8_000;
const MAX_RECORDING_MS = 60_000;
/* Browser-only dictation keeps the old ceiling: it ends itself on a pause. */
const DICTATION_MAX_MS = 15_000;
/* About a tenth of a second of sound above the floor before it counts as speech. */
const SPEECH_ONSET_FRAMES = 6;
const NOTICE_MS = 4_000;
/* How long Stop waits for the recorder's last chunk before finishing anyway. */
const RECORDER_STOP_GRACE_MS = 2_500;
/*
 * Speech, not music: 32 kb/s is plenty for a transcriber, and a quarter of
 * what a phone records by default, so a sentence uploads in a fraction of
 * the time on a mobile connection. The model hears the same thing either
 * way; it bills audio by the second, not the byte.
 */
const SPEECH_BITS_PER_SECOND = 32_000;

function createRecorder(stream: MediaStream) {
  try {
    return new MediaRecorder(stream, { audioBitsPerSecond: SPEECH_BITS_PER_SECOND });
  } catch {
    return new MediaRecorder(stream);
  }
}

export type VoicePhase = "idle" | "listening" | "understanding";

/**
 * Something the reader should be told when a recording produced nothing.
 *
 * Each of these used to end in silence: the microphone light went out and
 * the field stayed empty, and a reader had no way to tell "it did not hear
 * me" from "it is still thinking".
 */
export type VoiceNotice =
  | "no-speech"
  | "not-understood"
  | "unavailable"
  | "limit"
  | "mic-denied"
  /** Another app has the microphone: a call, a recording, Siri. */
  | "mic-busy"
  /** There is no microphone to open. */
  | "mic-missing"
  /** A weak signal: the phone's own recogniser answered; Yumi listens again later. */
  | "weak-local"
  /** No signal: the recording is kept, and heard once the signal is back. */
  | "queued";

/*
 * What a microphone that would not open was saying (Chi, 2026-11-27: the
 * console said "Microphone access is off" and nobody could tell where to
 * turn it on). Every refusal used to read as a switched-off permission,
 * and a microphone held by a phone call is not one the reader can switch
 * on in Settings.
 */
export function micNoticeFor(error: unknown): "mic-denied" | "mic-busy" | "mic-missing" {
  const name = (error as { name?: unknown } | null)?.name;
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "mic-missing";
  if (name === "NotReadableError" || name === "AbortError" || name === "TrackStartError") return "mic-busy";
  return "mic-denied";
}

/* These stay until the reader tries again: each asks them to do something. */
const STICKY_NOTICES = new Set<VoiceNotice>(["mic-denied", "mic-busy", "mic-missing", "queued"]);

/*
 * A held key: the reader decides when the sentence is over, so neither the
 * quiet after speech nor the no-speech window ends it (Chi, 2026-11-27:
 * 按住說話). The minute is still the ceiling.
 */
export type VoiceStartOptions = { hold?: boolean };

/* A recording kept for when the network is good again. */
type LateHearing = {
  audio: Blob;
  /** What the phone heard and was already used; empty when nothing was. */
  heard: string;
  /** upgrade: offer Yumi's hearing beside the phone's. replay: hear it at last. */
  kind: "upgrade" | "replay";
  at: number;
  tries: number;
};
/* Past this a kept recording belongs to a question nobody is asking any more. */
const LATE_HEARING_MS = 10 * 60_000;
const LATE_RETRY_MS = 15_000;
const BETTER_SHOWN_MS = 60_000;

function networkGood() {
  return isOnline() && !isWeakSignal();
}

/* Two hearings of one sentence differ when their words do, not their commas. */
function sameWords(a: string, b: string) {
  const plain = (text: string) => text.toLocaleLowerCase().replace(/[\s\p{P}]+/gu, "");
  return plain(a) === plain(b);
}

/**
 * What became of a recording handed to `onAudio`.
 *
 * `handled` — the caller has an answer and has used it.
 * `unheard` — the model listened and was not confident of anything.
 * `unavailable` — no answer could be fetched at all.
 * `limit` — today's allowance is spent.
 *
 * Anything but `handled` lets the browser's own transcript, when it heard
 * one, stand in — it is a worse answer than the model's, and a much better
 * one than nothing.
 */
export type VoiceAudioOutcome = "handled" | "unheard" | "unavailable" | "limit";

/**
 * Speech for the search surfaces: record the whole thing, then understand it.
 *
 * ── Two paths, and which one decides ─────────────────────────────────
 *
 * With `onAudio`, the recording is the answer. The microphone stays open
 * through pauses, a level meter decides when the speaker has finished, and
 * the audio goes to a model that was told nothing about which language to
 * expect — the only listener that can follow a stranger speaking a
 * language the reader is not studying, or a sentence longer than one breath.
 *
 * The browser's recogniser still runs alongside, for one job: the caption
 * under the field while the reader is speaking. It is told the language
 * being studied, so it is a preview, not a verdict — and it is kept as a
 * fallback for when the model cannot be reached.
 *
 * Without `onAudio` (the library's filter field) this is plain dictation in
 * the browser, as it always was. Its words reach `onCaption` while they are
 * being said, and it has a meter too (dictationCanMeter), only to move the
 * animation: on a computer the microphone's level, elsewhere a pulse for
 * each word the recogniser hears.
 *
 * ── The level ────────────────────────────────────────────────────────
 *
 * `bindLevel` is a ref callback. Bound elements get `--voice-level` (0–1)
 * written straight onto their style each frame, outside React: a ring that
 * re-rendered its component sixty times a second would be the least smooth
 * thing on the screen. The same frame writes the level and the voice's low
 * and high bands to lib/voice/signal.ts, which the liquid sea at the bottom
 * of the screen follows (Chi, 2026-11-12).
 */
export default function useVoiceInput({
  lang,
  onResult,
  onCaption,
  onAudio,
  onStart,
  transcribe,
}: {
  lang: string;
  onResult: (transcript: string) => void;
  /** Dictation only: the words heard so far, while they are being said. */
  onCaption?: (words: string) => void;
  /** Called as a recording opens: a moment to get ready for what it will need. */
  onStart?: () => void;
  onAudio?: (
    audio: Blob,
    context: { transcript: string },
  ) => Promise<VoiceAudioOutcome | void> | VoiceAudioOutcome | void;
  /**
   * Yumi's hearing of a recording, without acting on it: for a sentence the
   * phone's recogniser already answered on a weak signal. When it differs,
   * `better` offers it.
   */
  transcribe?: (audio: Blob) => Promise<string | null>;
}) {
  const records = Boolean(onAudio);
  const supported = useSyncExternalStore(
    emptySubscribe,
    records ? getRecordingSnapshot : getRecognitionSnapshot,
    getServerSnapshot,
  );

  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [caption, setCaption] = useState("");
  const [notice, setNoticeState] = useState<VoiceNotice | null>(null);
  const [held, setHeld] = useState(false);
  /* Yumi's hearing of a sentence the phone answered on a weak signal. */
  const [better, setBetter] = useState<string | null>(null);
  const listening = phase === "listening";
  useReloadHold(phase !== "idle");

  /* Yumi, on both homes, follows whichever microphone is open. */
  useEffect(() => {
    if (phase === "idle") return;
    voiceStage.phase = phase;
    return () => {
      voiceStage.phase = "idle";
      voiceStage.holding = false;
    };
  }, [phase]);

  type Session = {
    recognition: SpeechRecognitionLike | null;
    stream: MediaStream | null;
    recorder: MediaRecorder | null;
    audioContext: AudioContext | null;
    frame: number | null;
    chunks: Blob[];
    transcript: string;
    /** Whether the level meter ever heard speech. Null when there is no meter. */
    heardSpeech: boolean | null;
    stopped: boolean;
    cancelled: boolean;
    submitted: boolean;
    timer: ReturnType<typeof setTimeout> | null;
    /** Dictation's meter, whichever kind it got. */
    stopMeter: (() => void) | null;
    /** Set when dictation's meter is the recogniser's news of each word. */
    pulse: ((strength: number) => void) | null;
    /** How many characters dictation has heard, to size each pulse. */
    heard: number;
    /** Held down to talk: only letting go ends it. */
    hold: boolean;
    /** Dictation's words so far, for a held key let go before a final. */
    words: string;
    /** The phone's own recogniser answering for a weak signal. */
    local: boolean;
  };
  const sessionRef = useRef<Session | null>(null);
  const onResultRef = useRef(onResult);
  const onCaptionRef = useRef(onCaption);
  const onAudioRef = useRef(onAudio);
  const onStartRef = useRef(onStart);
  const transcribeRef = useRef(transcribe);
  useEffect(() => { transcribeRef.current = transcribe; }, [transcribe]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onCaptionRef.current = onCaption; }, [onCaption]);
  useEffect(() => { onAudioRef.current = onAudio; }, [onAudio]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  const levelTargets = useRef(new Set<HTMLElement>());
  const writeLevel = useCallback((level: number) => {
    const value = level.toFixed(3);
    for (const element of levelTargets.current) {
      element.style.setProperty("--voice-level", value);
    }
  }, []);
  const bindLevel = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    levelTargets.current.add(element);
    element.style.setProperty("--voice-level", "0");
    // React 19 calls the cleanup a ref callback returns on detach.
    return () => { levelTargets.current.delete(element); };
  }, []);

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = useCallback((value: VoiceNotice | null) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNoticeState(value);
    if (value === "mic-denied") setVoiceDeaf(true);
    if (value && !STICKY_NOTICES.has(value)) {
      noticeTimer.current = setTimeout(() => setNoticeState(null), value === "weak-local" ? NOTICE_MS * 2 : NOTICE_MS);
    }
  }, []);

  /* ── Hearing it later ────────────────────────────────────────────────
     A weak signal still answers at once with what the phone heard; the
     recording waits here for a good signal, then Yumi hears it. A replay
     (nothing was heard at all) goes through onAudio, as if just recorded;
     an upgrade only offers Yumi's words when they differ. */
  const lateRef = useRef<LateHearing | null>(null);
  const lateBusy = useRef(false);
  const betterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerBetter = useCallback((text: string | null) => {
    if (betterTimer.current) clearTimeout(betterTimer.current);
    betterTimer.current = null;
    setBetter(text);
    if (text) betterTimer.current = setTimeout(() => setBetter(null), BETTER_SHOWN_MS);
  }, []);
  useEffect(() => () => { if (betterTimer.current) clearTimeout(betterTimer.current); }, []);

  const hearLate = useCallback(async () => {
    const late = lateRef.current;
    if (!late || lateBusy.current || sessionRef.current || !networkGood()) return;
    if (Date.now() - late.at > LATE_HEARING_MS) { lateRef.current = null; return; }
    lateBusy.current = true;
    late.tries += 1;
    try {
      if (late.kind === "replay") {
        let outcome: VoiceAudioOutcome | void = "unavailable";
        try { outcome = await onAudioRef.current?.(late.audio, { transcript: "" }); } catch { /* Tried again later. */ }
        if (lateRef.current !== late) return;
        if (outcome === "unavailable" && late.tries < 3) return;
        lateRef.current = null;
        setNoticeState(current => (current === "queued" ? null : current));
        if (outcome === "limit") showNotice("limit");
        else if (outcome === "unheard") showNotice("not-understood");
        return;
      }
      let text: string | null = null;
      try { text = (await transcribeRef.current?.(late.audio)) ?? null; } catch { text = null; }
      if (lateRef.current !== late) return;
      if (text === null && late.tries < 3) return;
      lateRef.current = null;
      if (text && !sameWords(text, late.heard)) offerBetter(text.trim());
    } finally {
      lateBusy.current = false;
    }
  }, [offerBetter, showNotice]);
  const hearLateRef = useRef(hearLate);
  useEffect(() => { hearLateRef.current = hearLate; }, [hearLate]);
  useEffect(() => {
    const unsubscribe = subscribeNetwork(() => { void hearLateRef.current(); });
    const timer = setInterval(() => { if (lateRef.current) void hearLateRef.current(); }, LATE_RETRY_MS);
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);
  const keepForLater = useCallback((audio: Blob, heard: string, kind: LateHearing["kind"]) => {
    if (audio.size === 0) return;
    if (kind === "upgrade" && !transcribeRef.current) return;
    lateRef.current = { audio, heard, kind, at: Date.now(), tries: 0 };
  }, []);

  /** Yumi's words for the sentence, once, for the surface to look up. */
  const takeBetter = useCallback(() => {
    const text = better;
    offerBetter(null);
    return text;
  }, [better, offerBetter]);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  const release = useCallback((session: Session) => {
    session.stopped = true;
    if (session.timer) { clearTimeout(session.timer); session.timer = null; }
    if (session.frame !== null) { cancelAnimationFrame(session.frame); session.frame = null; }
    session.stopMeter?.();
    session.stopMeter = null;
    session.pulse = null;
    try {
      if (session.recorder?.state === "recording") session.recorder.stop();
    } catch { /* Track release below is still required. */ }
    for (const track of session.stream?.getTracks() ?? []) track.stop();
    session.stream = null;
    if (session.audioContext) {
      void session.audioContext.close().catch(() => undefined);
      session.audioContext = null;
    }
    writeLevel(0);
    resetVoiceSignal();
  }, [writeLevel]);

  const cancel = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.cancelled = true;
    sessionRef.current = null;
    try { session.recognition?.abort(); } catch { /* Already ended. */ }
    release(session);
    setPhase("idle");
    setCaption("");
  }, [release]);

  useEffect(() => () => {
    const session = sessionRef.current;
    if (!session) return;
    session.cancelled = true;
    sessionRef.current = null;
    try { session.recognition?.abort(); } catch { /* Already ended. */ }
    release(session);
  }, [release]);

  /*
   * The end of a recording: hand it over, wait for the answer, fall back.
   * Runs once per session, whichever of tap, silence or the ceiling got
   * there first.
   */
  const finish = useCallback(async (session: Session) => {
    if (session.submitted || session.cancelled) return;
    session.submitted = true;
    const current = () => sessionRef.current === session && !session.cancelled;
    const transcript = session.transcript.trim();
    const audio = new Blob(session.chunks, {
      type: session.recorder?.mimeType || "audio/webm",
    });
    session.chunks = [];

    if (session.heardSpeech === false && !transcript) {
      if (current()) { sessionRef.current = null; setPhase("idle"); setCaption(""); }
      showNotice("no-speech");
      return;
    }

    /*
     * A weak signal with the phone's own words in hand (a computer, where
     * the recogniser captions beside the recording): those words now, and
     * Yumi's later, rather than a minute of waiting on an upload.
     */
    if (transcript && audio.size > 0 && onAudioRef.current && !networkGood()) {
      if (!current()) return;
      sessionRef.current = null;
      setPhase("idle");
      setCaption("");
      onResultRef.current(transcript);
      keepForLater(audio, transcript, "upgrade");
      showNotice("weak-local");
      return;
    }

    if (audio.size === 0 || !onAudioRef.current) {
      if (!current()) return;
      sessionRef.current = null;
      setPhase("idle");
      setCaption("");
      if (transcript) onResultRef.current(transcript);
      else showNotice(audio.size === 0 ? "no-speech" : "not-understood");
      return;
    }

    setPhase("understanding");
    let outcome: VoiceAudioOutcome | void;
    try {
      outcome = await onAudioRef.current(audio, { transcript });
    } catch {
      outcome = "unavailable";
    }
    if (!current()) return;
    sessionRef.current = null;
    setPhase("idle");
    setCaption("");

    if (!outcome || outcome === "handled") return;
    if (transcript) onResultRef.current(transcript);
    if (outcome === "limit") showNotice("limit");
    else if (!transcript && outcome === "unavailable" && !networkGood()) {
      // Nothing heard, nothing reachable: keep it for a good signal.
      keepForLater(audio, "", "replay");
      showNotice("queued");
    } else if (!transcript) showNotice(outcome === "unheard" ? "not-understood" : "unavailable");
  }, [keepForLater, showNotice]);

  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; }, [finish]);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    endRecognition(session);

    if (session.recorder && session.recorder.state === "recording") {
      // onstop delivers the last chunk, then finishes. If a recorder never
      // says it stopped, the mic must not be left spinning for good: what
      // was captured is sent anyway. finish() runs once either way.
      release(session);
      setPhase("understanding");
      setTimeout(() => { void finishRef.current(session); }, RECORDER_STOP_GRACE_MS);
      return;
    }

    release(session);
    if (records && session.recorder) {
      // The recorder ended on its own (an interruption, an error) without
      // finishing: send what it caught. A no-op if it already finished.
      void finishRef.current(session);
      return;
    }
    // Dictation keeps its session: the recogniser's final words arrive
    // after stop() and are still the reader's. onend lets it go. So does
    // the phone's own recogniser standing in on a weak signal.
    if (!records || session.local) {
      setPhase("idle");
      setCaption("");
      return;
    }
    // Stopped before the microphone opened: there is nothing to send.
    sessionRef.current = null;
    setPhase("idle");
    setCaption("");
  }, [records, release]);

  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; }, [stop]);

  /* The level meter, which is also what notices the speaker has finished. */
  const meter = useCallback((session: Session, stream: MediaStream) => {
    const context = session.audioContext;
    if (!context) return;
    let analyser: AnalyserNode;
    try {
      const source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
    } catch {
      return;
    }

    session.heardSpeech = false;
    const samples = new Float32Array(analyser.fftSize);
    const bands = createBandReader(analyser);
    const startedAt = performance.now();
    /*
     * A meter that never reads anything is a broken meter, not a silent
     * room: an AudioContext the browser left suspended hands back zeros.
     * Trusting it would throw away a real recording as "nothing heard", so
     * after the no-speech window it steps aside and the recording runs on
     * until the reader taps or the minute is up.
     */
    let sawSignal = false;
    let floor = -1;
    let level = 0;
    let onsetFrames = 0;
    let lastSpeechAt = 0;

    const tick = () => {
      if (session.stopped || session.cancelled) return;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      if (rms > 1e-6) sawSignal = true;

      /* The room's own noise, learned quickly downwards and slowly upwards,
         so a fan or a café sets the bar rather than tripping it. */
      if (floor < 0) floor = rms;
      else if (rms < floor) floor = floor * 0.6 + rms * 0.4;
      else floor += (rms - floor) * 0.003;

      const threshold = Math.max(0.012, floor * 2.6);
      const now = performance.now();
      if (rms > threshold) {
        onsetFrames += 1;
        if (onsetFrames >= SPEECH_ONSET_FRAMES) {
          session.heardSpeech = true;
          lastSpeechAt = now;
        }
      } else {
        onsetFrames = Math.max(0, onsetFrames - 1);
      }

      // Decibels onto 0–1, quick to rise and slow to fall, like a VU needle.
      level = levelFromRms(rms, level);
      writeLevel(level);
      bands.read(level);

      if (session.hold) { session.frame = requestAnimationFrame(tick); return; }
      if (session.heardSpeech && now - lastSpeechAt > SILENCE_END_MS) { stopRef.current(); return; }
      if (!session.heardSpeech && now - startedAt > NO_SPEECH_MS) {
        // A muted track really is recording nothing: say so now rather
        // than after a minute of silence.
        const muted = stream.getAudioTracks().some(track => track.muted);
        if (!sawSignal && !muted) { session.heardSpeech = null; writeLevel(0); resetVoiceSignal(); return; }
        stopRef.current();
        return;
      }
      session.frame = requestAnimationFrame(tick);
    };
    session.frame = requestAnimationFrame(tick);
  }, [writeLevel]);

  const start = useCallback((options: VoiceStartOptions = {}) => {
    const hold = Boolean(options.hold);
    const wantsRecording = records && canRecord();
    const available = getRecognitionConstructor();
    /*
     * A weak signal on an iPhone, where the recogniser cannot share the
     * microphone with a recording: the phone's own recogniser answers
     * instead, at once, rather than an upload that may never arrive
     * (Chi, 2026-11-27: 弱訊號備援). Weak, not gone: Safari's recogniser
     * mostly needs the network too, and with none it would lose the
     * sentence. With no network at all the recording is made as ever and
     * kept until there is one ("queued").
     */
    const local = wantsRecording && !recognizerSharesMicrophone() && available !== null && isOnline() && isWeakSignal();
    const recording = wantsRecording && !local;
    const Recognition = recording && !recognizerSharesMicrophone() ? null : available;
    if (!Recognition && !recording) return;
    cancel();
    showNotice(null);
    offerBetter(null);
    lateRef.current = null;
    setHeld(hold);
    voiceStage.holding = hold;
    // A pronunciation still playing would be recorded as the reader's words,
    // and on iOS it holds the audio session the microphone is about to need.
    stopSpeech();
    if (recording) onStartRef.current?.();

    const session: Session = {
      recognition: Recognition ? new Recognition() : null,
      stream: null,
      recorder: null,
      audioContext: null,
      frame: null,
      chunks: [],
      transcript: "",
      heardSpeech: null,
      stopped: false,
      cancelled: false,
      submitted: false,
      timer: null,
      stopMeter: null,
      pulse: null,
      heard: 0,
      hold,
      words: "",
      local,
    };
    sessionRef.current = session;
    const current = () => sessionRef.current === session && !session.cancelled;
    const recognition = session.recognition;

    if (recognition) {
      recognition.lang = lang;
      // Recording: captions for as long as the reader speaks. Dictation:
      // one utterance, as the filter field has always worked.
      recognition.continuous = recording || hold;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = event => {
        if (!current() || session.submitted) return;
        let finals = "";
        let interim = "";
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finals += result[0].transcript;
          else interim += result[0].transcript;
        }
        // A recogniser asked for zh-TW still writes Simplified.
        if (recording) {
          session.transcript = tidyChinese(finals);
          setCaption(tidyChinese(`${finals}${interim}`.trim()));
          return;
        }
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
        }
        const words = tidyChinese(`${finals}${interim}`.trim());
        // Each new syllable swells the sea where nothing meters the voice.
        session.pulse?.(Math.max(0.2, Math.min(1, (words.length - session.heard) / 6)));
        session.heard = words.length;
        session.words = words;
        setCaption(words);
        if (words) onCaptionRef.current?.(words);
        // Held: the whole of it, once the key is let go (onend).
        if (session.hold) { session.transcript = tidyChinese(finals.trim()); return; }
        if (transcript.trim()) {
          session.submitted = true;
          onResultRef.current(tidyChinese(transcript.trim()));
          if (session.local) showNotice("weak-local");
        }
      };
      recognition.onerror = event => {
        if (!current()) return;
        // Recording: the recogniser only captions, and the recording carries
        // on without it — no caption is not a failure worth reporting.
        if (recording) return;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") showNotice("mic-denied");
        else if (event.error === "audio-capture") showNotice("mic-busy");
        else if (event.error === "network" && session.local) showNotice("unavailable");
        else if (event.error !== "aborted" && event.error !== "no-speech") console.error("Speech recognition failed:", event.error);
        release(session);
        sessionRef.current = null;
        setPhase("idle");
        setCaption("");
      };
      recognition.onspeechstart = () => {
        if (current()) session.pulse?.(0.6);
      };
      recognition.onend = () => {
        if (recording) return; // The recording, not the recogniser, decides.
        if (session.hold && !session.submitted && !session.cancelled) {
          const said = (session.transcript || session.words).trim();
          if (said) {
            session.submitted = true;
            onResultRef.current(said);
            if (session.local) showNotice("weak-local");
          }
        }
        release(session);
        if (current()) {
          sessionRef.current = null;
          setPhase("idle");
          setCaption("");
        }
      };
    }

    if (recording) {
      const Context = audioContextConstructor();
      if (Context) {
        try {
          // Created inside the tap: iOS will not start one any later.
          session.audioContext = new Context();
          void session.audioContext.resume?.().catch(() => undefined);
        } catch { session.audioContext = null; }
      }

      void navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        // Permission can arrive after Stop, navigation, or another recording.
        if (!current() || session.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
        session.stream = stream;
        // She hears again: the earmuffs come off.
        if (voiceStage.deaf) setVoiceDeaf(false);
        const recorder = createRecorder(stream);
        session.recorder = recorder;
        recorder.ondataavailable = event => { if (event.data.size > 0) session.chunks.push(event.data); };
        recorder.onstop = () => {
          release(session);
          endRecognition(session);
          void finish(session);
        };
        recorder.start();
        // Opening the microphone switches iOS's audio session, which can
        // interrupt a context started a moment earlier; the meter would
        // read zeros and never hear the speaker finish.
        void session.audioContext?.resume?.().catch(() => undefined);
        meter(session, stream);
      }).catch(error => {
        if (!current()) return;
        try { recognition?.abort(); } catch { /* Already ended. */ }
        release(session);
        sessionRef.current = null;
        setPhase("idle");
        setCaption("");
        showNotice(micNoticeFor(error));
      });
    }

    if (!recording && recognition) {
      const pulseWords = () => {
        const pulse = speechPulse(writeLevel);
        session.pulse = pulse.pulse;
        session.stopMeter = pulse.stop;
      };
      const Context = dictationCanMeter() ? audioContextConstructor() : null;
      if (Context) {
        try {
          // Created inside the tap, as the recording's is.
          session.audioContext = new Context();
          void session.audioContext.resume?.().catch(() => undefined);
        } catch { session.audioContext = null; }
      }
      if (session.audioContext) {
        void navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const context = session.audioContext;
          if (!current() || session.stopped || !context) { stream.getTracks().forEach(track => track.stop()); return; }
          session.stream = stream;
          if (voiceStage.deaf) setVoiceDeaf(false);
          void context.resume?.().catch(() => undefined);
          session.stopMeter = meterStream(context, stream, writeLevel);
        }).catch(() => {
          // The recogniser reports a refused microphone itself; the
          // animation still has the words.
          if (current() && !session.stopped) pulseWords();
        });
      } else {
        pulseWords();
      }
    }

    try {
      recognition?.start();
    } catch (error) {
      if (!recording) {
        session.cancelled = true;
        release(session);
        setPhase("idle");
        console.error("Could not start speech recognition:", error);
        return;
      }
      // Captions are a nicety; the recording carries on without them.
    }

    setPhase("listening");
    setCaption("");
    session.timer = setTimeout(() => {
      if (!current()) return;
      // A held key at the minute: what was said is still sent.
      if (recording || hold) { stopRef.current(); return; }
      try { recognition?.abort(); } catch { /* Already ended. */ }
      release(session);
      sessionRef.current = null;
      setPhase("idle");
      setCaption("");
    }, recording || hold ? MAX_RECORDING_MS : DICTATION_MAX_MS);
  }, [lang, records, cancel, release, finish, meter, showNotice, writeLevel, offerBetter]);

  const toggle = useCallback(() => {
    if (phase === "listening") {
      stop();
      return;
    }
    if (phase === "understanding") return;

    start();
  }, [phase, start, stop]);

  return {
    supported,
    listening,
    phase,
    caption,
    notice,
    /** Held down to talk, this session. */
    held,
    /** Yumi's hearing of a sentence the phone answered on a weak signal. */
    better,
    takeBetter,
    start,
    stop,
    cancel,
    toggle,
    bindLevel,
  };
}
