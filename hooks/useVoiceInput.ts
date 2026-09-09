"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  /** Set the moment the browser produces a transcript worth using. */
  const heardRef = useRef(false);

  // Keep the latest callback in a ref so starting a session doesn't need
  // to tear down and rebuild the recognizer every time the parent
  // re-renders with a new closure.
  const onResultRef = useRef(onResult);
  const onAudioRef = useRef(onAudio);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onAudioRef.current = onAudio;
  }, [onAudio]);

  const releaseMicrophone = useCallback(() => {
    // The recording indicator stays lit until every track is stopped, and
    // a light that does not go out reads as an app still listening.
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      releaseMicrophone();
    };
  }, [releaseMicrophone]);

  /**
   * Records alongside the browser's own recognition, for the fallback.
   *
   * Failure here is silent and not fatal: a denied microphone or a browser
   * without MediaRecorder simply means there is no second chance, and the
   * fast path is unaffected.
   */
  const startRecording = useCallback(async () => {
    if (!onAudioRef.current) return;
    if (typeof MediaRecorder === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        releaseMicrophone();

        // Only when the browser came back empty. The recording exists for
        // a fallback, and a fallback that fires anyway is just a bill.
        if (heardRef.current) return;

        const audio = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audio.size > 0) onAudioRef.current?.(audio);
      };

      recorder.start();
      recorderRef.current = recorder;
    } catch {
      releaseMicrophone();
    }
  }, [releaseMicrophone]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();

    if (!Recognition) return;

    // Restarting while a session is live throws in Chrome, so always
    // tear the previous one down first.
    recognitionRef.current?.abort();

    heardRef.current = false;
    void startRecording();

    const recognition = new Recognition();

    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }

      const trimmed = transcript.trim();

      if (trimmed) {
        heardRef.current = true;
        onResultRef.current(trimmed);
      }
    };

    recognition.onerror = (event) => {
      // "aborted" and "no-speech" are ordinary outcomes (user cancelled,
      // or stayed silent) — not worth surfacing as failures.
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("Speech recognition failed:", event.error);
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);

      // Whatever the browser made of it, the recording stops here — and
      // its own handler decides whether anyone needs to hear it.
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (startError) {
      console.error("Could not start speech recognition:", startError);
      setListening(false);

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }
  }, [lang, startRecording]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }

    start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
