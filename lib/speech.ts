/**
 * Speak a word using the browser's built-in speech synthesis.
 * `lang` should be "zh-TW" for Chinese words or "en-US" for English words.
 * Safe to call even if the browser doesn't support speech synthesis —
 * it will just silently no-op.
 */
export function speak(text: string, lang: "zh-TW" | "en-US") {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  // Cancel anything currently playing so taps don't queue up and overlap.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.75;

  window.speechSynthesis.speak(utterance);
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
