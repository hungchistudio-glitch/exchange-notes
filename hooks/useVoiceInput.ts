"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Minimal structural types for the Web Speech API. TypeScript's lib.dom
 * still ships these as vendor-prefixed-only in most versions, so we
 * declare just the surface we actually touch rather than pulling in a
 * dependency for it.
 */
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// useSyncExternalStore rather than a setState-in-effect: support never
// changes at runtime, and this keeps the server snapshot (false) and the
// client snapshot reconciled by React instead of causing a hydration
// mismatch or an extra render pass.
const emptySubscribe = () => () => {};
const getSupportedSnapshot = () => getRecognitionConstructor() !== null;
const getServerSnapshot = () => false;

/**
 * Browser-native speech-to-text for the vocabulary search field.
 *
 * Deliberately uses the built-in Web Speech API rather than sending audio
 * to an AI endpoint: recognition runs on-device, costs nothing per use,
 * adds no token consumption, and returns a result with far lower latency.
 * The tradeoff is that accuracy is middling and support is inconsistent
 * (notably older iOS Safari), so `supported` is exposed for callers to
 * hide the entry point entirely instead of offering a button that fails.
 */
export default function useVoiceInput({
  lang,
  onResult,
}: {
  lang: string;
  onResult: (transcript: string) => void;
}) {
  const supported = useSyncExternalStore(
    emptySubscribe,
    getSupportedSnapshot,
    getServerSnapshot,
  );

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Keep the latest callback in a ref so starting a session doesn't need
  // to tear down and rebuild the recognizer every time the parent
  // re-renders with a new closure.
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();

    if (!Recognition) return;

    // Restarting while a session is live throws in Chrome, so always
    // tear the previous one down first.
    recognitionRef.current?.abort();

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
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (startError) {
      console.error("Could not start speech recognition:", startError);
      setListening(false);
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }

    start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
