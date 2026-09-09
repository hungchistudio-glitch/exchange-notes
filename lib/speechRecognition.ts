/**
 * The Web Speech API's recognition half, typed and located once.
 *
 * TypeScript's lib.dom ships SpeechRecognitionResult and its alternatives
 * but still not the recogniser itself, and the constructor is prefixed on
 * WebKit. These declarations cover exactly the surface this app touches —
 * a dependency would be a lot of weight for eleven properties.
 *
 * Shared by the vocabulary search field (hooks/useVoiceInput.ts) and the
 * Pronunciation Lab's speaking analyzer, which used to be a reason to write
 * this twice.
 */

export type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence: number;
};

export type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  0: SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

export type SpeechRecognitionErrorLike = { error: string };

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  onspeechend?: (() => void) | null;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}