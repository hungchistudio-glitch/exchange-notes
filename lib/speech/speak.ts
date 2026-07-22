function speak(
  text: string,
  language: string,
) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = language;
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;


  window.speechSynthesis.speak(utterance);
}

export function speakEnglish(text: string) {
  if (!text?.trim()) return;

  speak(text, "en-US");
}

export function speakChinese(text: string) {
  if (!text?.trim()) return;

  speak(text, "zh-TW");
}

export function stopSpeaking() {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();
}
