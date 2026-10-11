"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReloadHold } from "@/lib/pwa/reloadHolds";

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
 * Two seconds of quiet after speech is the pause between one thought and
 * the next, not the breath inside a sentence, which is what the browser's
 * own end-of-speech used to cut on. A minute is longer than anyone holds a
 * phone up to a stranger. Eight seconds with no speech at all is a
 * microphone pointed at nothing, and uploading that would spend a request
 * on silence.
 */
const SILENCE_END_MS = 1_800;
const NO_SPEECH_MS = 8_000;
const MAX_RECORDING_MS = 60_000;
/* Browser-only dictation keeps the old ceiling: it ends itself on a pause. */
const DICTATION_MAX_MS = 15_000;
/* About a tenth of a second of sound above the floor before it counts as speech. */
const SPEECH_ONSET_FRAMES = 6;
const NOTICE_MS = 4_000;

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
  | "mic-denied";

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
 * the browser, as it always was.
 *
 * ── The level ────────────────────────────────────────────────────────
 *
 * `bindLevel` is a ref callback. Bound elements get `--voice-level` (0–1)
 * written straight onto their style each frame, outside React: a ring that
 * re-rendered its component sixty times a second would be the least smooth
 * thing on the screen.
 */
export default function useVoiceInput({
  lang,
  onResult,
  onAudio,
}: {
  lang: string;
  onResult: (transcript: string) => void;
  onAudio?: (
    audio: Blob,
    context: { transcript: string },
  ) => Promise<VoiceAudioOutcome | void> | VoiceAudioOutcome | void;
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
  const listening = phase === "listening";
  useReloadHold(phase !== "idle");

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
  };
  const sessionRef = useRef<Session | null>(null);
  const onResultRef = useRef(onResult);
  const onAudioRef = useRef(onAudio);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onAudioRef.current = onAudio; }, [onAudio]);

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
    if (value) noticeTimer.current = setTimeout(() => setNoticeState(null), NOTICE_MS);
  }, []);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  const release = useCallback((session: Session) => {
    session.stopped = true;
    if (session.timer) { clearTimeout(session.timer); session.timer = null; }
    if (session.frame !== null) { cancelAnimationFrame(session.frame); session.frame = null; }
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
    else if (!transcript) showNotice(outcome === "unheard" ? "not-understood" : "unavailable");
  }, [showNotice]);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    endRecognition(session);

    if (session.recorder && session.recorder.state === "recording") {
      // onstop delivers the last chunk, then finishes.
      release(session);
      setPhase("understanding");
      return;
    }

    release(session);
    if (records && !session.recorder) {
      // Stopped before the microphone opened: there is nothing to send.
      sessionRef.current = null;
      setPhase("idle");
      setCaption("");
      return;
    }
    if (!records) {
      sessionRef.current = null;
      setPhase("idle");
      setCaption("");
    }
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
    const startedAt = performance.now();
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
      const db = 20 * Math.log10(Math.max(rms, 1e-5));
      const target = Math.min(1, Math.max(0, (db + 58) / 40));
      level = target > level ? level + (target - level) * 0.55 : level * 0.9 + target * 0.1;
      writeLevel(level);

      if (session.heardSpeech && now - lastSpeechAt > SILENCE_END_MS) { stopRef.current(); return; }
      if (!session.heardSpeech && now - startedAt > NO_SPEECH_MS) { stopRef.current(); return; }
      session.frame = requestAnimationFrame(tick);
    };
    session.frame = requestAnimationFrame(tick);
  }, [writeLevel]);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    const recording = records && canRecord();
    if (!Recognition && !recording) return;
    cancel();
    showNotice(null);

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
    };
    sessionRef.current = session;
    const current = () => sessionRef.current === session && !session.cancelled;
    const recognition = session.recognition;

    if (recognition) {
      recognition.lang = lang;
      // Recording: captions for as long as the reader speaks. Dictation:
      // one utterance, as the filter field has always worked.
      recognition.continuous = recording;
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
        if (recording) {
          session.transcript = finals;
          setCaption(`${finals}${interim}`.trim());
          return;
        }
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
        }
        setCaption(`${finals}${interim}`.trim());
        if (transcript.trim()) {
          session.submitted = true;
          onResultRef.current(transcript.trim());
        }
      };
      recognition.onerror = event => {
        if (!current()) return;
        // Recording: the recogniser only captions, and the recording carries
        // on without it — no caption is not a failure worth reporting.
        if (recording) return;
        if (event.error === "not-allowed") showNotice("mic-denied");
        else if (event.error !== "aborted" && event.error !== "no-speech") console.error("Speech recognition failed:", event.error);
        release(session);
        sessionRef.current = null;
        setPhase("idle");
        setCaption("");
      };
      recognition.onend = () => {
        if (recording) return; // The recording, not the recogniser, decides.
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
        const recorder = new MediaRecorder(stream);
        session.recorder = recorder;
        recorder.ondataavailable = event => { if (event.data.size > 0) session.chunks.push(event.data); };
        recorder.onstop = () => {
          release(session);
          endRecognition(session);
          void finish(session);
        };
        recorder.start();
        meter(session, stream);
      }).catch(() => {
        if (!current()) return;
        try { recognition?.abort(); } catch { /* Already ended. */ }
        release(session);
        sessionRef.current = null;
        setPhase("idle");
        setCaption("");
        showNotice("mic-denied");
      });
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
      if (recording) { stopRef.current(); return; }
      try { recognition?.abort(); } catch { /* Already ended. */ }
      release(session);
      sessionRef.current = null;
      setPhase("idle");
      setCaption("");
    }, recording ? MAX_RECORDING_MS : DICTATION_MAX_MS);
  }, [lang, records, cancel, release, finish, meter, showNotice]);

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
    start,
    stop,
    cancel,
    toggle,
    bindLevel,
  };
}
