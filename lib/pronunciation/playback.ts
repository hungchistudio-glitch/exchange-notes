import { getSpeechSettings, getVoiceForLanguage } from "@/lib/speech";

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  ) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(
  text: string,
  lang: "en-US" | "zh-TW",
) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  stopSpeech();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.pitch = 1;

  // Reuse the same voice-quality tiering and user rate preference as the
  // rest of the app (Pronunciation Lab, Vocabulary speaker buttons) —
  // this used to be a separate, weaker regex-based voice match (a fixed
  // English name allowlist, and a Chinese match that didn't exclude
  // Mainland/Cantonese zh-CN/zh-HK voices), so word-card playback sounded
  // noticeably worse than everywhere else in the app for no real reason.
  const settings = getSpeechSettings();
  utterance.rate = settings.rate;

  const voice = getVoiceForLanguage(lang);
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

type PlayAudioOptions = {
  fallback?: () => void;
  onMissing?: () => void;
};

export function playAudio(
  src?: string,
  options: PlayAudioOptions = {},
) {
  stopSpeech();

  if (!src) {
    options.onMissing?.();
    return;
  }

  const audio = new Audio(src);
  currentAudio = audio;

  let handledError = false;

  const handleError = () => {
    if (handledError) return;

    handledError = true;
    currentAudio = null;

    if (options.fallback) {
      options.fallback();
    } else {
      options.onMissing?.();
    }
  };

  audio.addEventListener("error", handleError, {
    once: true,
  });

  audio.addEventListener(
    "ended",
    () => {
      currentAudio = null;
    },
    { once: true },
  );

  void audio.play().catch(handleError);
}
