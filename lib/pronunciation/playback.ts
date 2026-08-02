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
  utterance.rate = lang === "en-US" ? 0.82 : 0.78;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();

  const preferredVoice = voices.find((voice) => {
    if (lang === "en-US") {
      return (
        voice.lang === "en-US" &&
        /Samantha|Ava|Allison|Google US English/i.test(
          voice.name,
        )
      );
    }

    return (
      /zh-TW/i.test(voice.lang) ||
      /Meijia|美佳/i.test(voice.name)
    );
  });

  if (preferredVoice) {
    utterance.voice = preferredVoice;
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
