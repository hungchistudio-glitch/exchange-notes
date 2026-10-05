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
const getSupportedSnapshot = () => getRecognitionConstructor() !== null;
const getServerSnapshot = () => false;

/**
 * Speech-to-text for the vocabulary search field. Fast first, then sure.
 *
 * ── Why there are two paths ───────────────────────────────────────────
 *
 * The Web Speech API has to be told the language before it listens, and it
 * will not tell you it guessed wrong: it returns whatever the words it was
 * expecting sound closest to. That is exactly right when the reader is
 * dictating the language they study, and useless when they hold the phone
 * up to someone speaking something else — which is the case a traveller
 * actually has.
 *
 * So the browser goes first, because it is instant and free and costs no
 * quota, and the audio is recorded alongside it. When the browser comes
 * back with nothing — silence, an error, or a language it was not
 * listening for — the recording goes to a model that was told nothing and
 * can hear any of them. The reader speaks once either way.
 *
 * `supported` covers the browser path only. The recording path works
 * wherever MediaRecorder does, which is nearly everywhere the other is
 * missing, so a device without recognition is still not a device without
 * voice search.
 */
export default function useVoiceInput({
  lang,
  onResult,
  onAudio,
}: {
  lang: string;
  onResult: (transcript: string) => void;
  /**
   * The recording, handed over when the browser heard nothing usable.
   *
   * Not called at all when the fast path worked: the audio was captured
   * for a fallback that turned out not to be needed, and uploading it
   * anyway would spend a request on an answer already in hand.
   */
  onAudio?: (audio: Blob) => void;
}) {
  const supported = useSyncExternalStore(
    emptySubscribe,
    getSupportedSnapshot,
    getServerSnapshot,
  );

  const [listening, setListening] = useState(false);
  useReloadHold(listening);
  type Session = {
    recognition: SpeechRecognitionLike;
    stream: MediaStream | null;
    recorder: MediaRecorder | null;
    chunks: Blob[];
    heard: boolean;
    stopped: boolean;
    cancelled: boolean;
    recognitionEnded: boolean;
    recordingEnded: boolean;
    submitted: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  };
  const sessionRef = useRef<Session | null>(null);
  const onResultRef = useRef(onResult);
  const onAudioRef = useRef(onAudio);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onAudioRef.current = onAudio; }, [onAudio]);

  const release = useCallback((session: Session) => {
    session.stopped = true;
    if (session.timer) { clearTimeout(session.timer); session.timer = null; }
    try {
      if (session.recorder?.state === "recording") session.recorder.stop();
    } catch { /* Track release below is still required. */ }
    for (const track of session.stream?.getTracks() ?? []) track.stop();
    session.stream = null;
  }, []);

  const cancel = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    session.cancelled = true;
    sessionRef.current = null;
    try { session.recognition.abort(); } catch { /* Already ended. */ }
    release(session);
    setListening(false);
  }, [release]);

  useEffect(() => () => {
    const session = sessionRef.current;
    if (!session) return;
    session.cancelled = true;
    sessionRef.current = null;
    try { session.recognition.abort(); } catch { /* Already ended. */ }
    release(session);
  }, [release]);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    try { session.recognition.stop(); } catch { /* Already ended. */ }
    release(session);
    setListening(false);
  }, [release]);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) return;
    cancel();
    const recognition = new Recognition();
    const session: Session = { recognition, stream: null, recorder: null, chunks: [], heard: false, stopped: false, cancelled: false, recognitionEnded: false, recordingEnded: false, submitted: false, timer: null };
    sessionRef.current = session;
    const current = () => sessionRef.current === session && !session.cancelled;
    const deliverAudio = () => {
      if (!current() || session.heard || session.submitted || !session.recognitionEnded || !session.recordingEnded) return;
      const audio = new Blob(session.chunks, { type: session.recorder?.mimeType || "audio/webm" });
      session.chunks = [];
      if (audio.size > 0) { session.submitted = true; onAudioRef.current?.(audio); }
    };
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      if (!current() || session.submitted) return;
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        session.heard = true;
        session.submitted = true;
        onResultRef.current(transcript.trim());
      }
    };
    recognition.onerror = event => {
      if (!current()) return;
      if (event.error !== "aborted" && event.error !== "no-speech") console.error("Speech recognition failed:", event.error);
      session.recognitionEnded = true;
      release(session);
      deliverAudio();
      setListening(false);
    };
    recognition.onend = () => {
      session.recognitionEnded = true;
      release(session);
      deliverAudio();
      if (current()) setListening(false);
    };

    if (onAudioRef.current && typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      void navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        // Permission can arrive after Stop, navigation, or another recording.
        if (!current() || session.stopped) { stream.getTracks().forEach(track => track.stop()); return; }
        session.stream = stream;
        const recorder = new MediaRecorder(stream);
        session.recorder = recorder;
        recorder.ondataavailable = event => { if (event.data.size > 0) session.chunks.push(event.data); };
        recorder.onstop = () => {
          release(session);
          session.recordingEnded = true;
          deliverAudio();
        };
        recorder.start();
      }).catch(() => release(session));
    }
    try {
      recognition.start();
      setListening(true);
      session.timer = setTimeout(() => {
        if (!current()) return;
        try { recognition.abort(); } catch { /* Already ended. */ }
        session.recognitionEnded = true;
        release(session);
        deliverAudio();
        setListening(false);
      }, 15_000);
    } catch (error) {
      session.cancelled = true;
      release(session);
      setListening(false);
      console.error("Could not start speech recognition:", error);
    }
  }, [lang, cancel, release]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }

    start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, cancel, toggle };
}
