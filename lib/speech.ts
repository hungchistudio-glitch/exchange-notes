export type VoiceGender = "female" | "male";

export type SpeechSettings = {
  rate: number;
  voiceGender: VoiceGender;
};

const SETTINGS_STORAGE_KEY = "speech-settings";

const DEFAULT_SETTINGS: SpeechSettings = {
  rate: 0.75,
  voiceGender: "female",
};

export function getSpeechSettings(): SpeechSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<SpeechSettings>;

    return {
      rate:
        typeof parsed.rate === "number" ? parsed.rate : DEFAULT_SETTINGS.rate,
      voiceGender:
        parsed.voiceGender === "male" || parsed.voiceGender === "female"
          ? parsed.voiceGender
          : DEFAULT_SETTINGS.voiceGender,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setSpeechSettings(settings: SpeechSettings): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore.
  }
}

// Browsers don't expose voice gender as data — only as part of the
// human-readable name, and that varies a lot by OS/browser. These are
// best-effort hints, not a guarantee.
const FEMALE_NAME_HINTS = [
  "female",
  "woman",
  "samantha",
  "susan",
  "ting-ting",
  "婷婷",
  "美嘉",
  "meijia",
];
const MALE_NAME_HINTS = [
  "male",
  "man",
  "alex",
  "daniel",
  "aaron",
  "宥树",
  "yu-shu",
];

let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoices = window.speechSynthesis.getVoices();
  });
}

function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined") return [];
  const fresh = window.speechSynthesis.getVoices();
  return fresh.length > 0 ? fresh : cachedVoices;
}

function pickVoiceForGender(
  lang: "zh-TW" | "en-US",
  gender: VoiceGender
): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  const langPrefix = lang.slice(0, 2).toLowerCase();

  const candidates = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(langPrefix)
  );

  if (candidates.length === 0) return null;

  const hints = gender === "female" ? FEMALE_NAME_HINTS : MALE_NAME_HINTS;
  const otherHints = gender === "female" ? MALE_NAME_HINTS : FEMALE_NAME_HINTS;

  const matched = candidates.find((voice) => {
    const name = voice.name.toLowerCase();
    return hints.some((hint) => name.includes(hint));
  });

  if (matched) return matched;

  // No name matched the requested gender. Avoid anything that clearly
  // matches the OTHER gender so the two settings still sound different.
  const remaining = candidates.filter((voice) => {
    const name = voice.name.toLowerCase();
    return !otherHints.some((hint) => name.includes(hint));
  });

  const pool = remaining.length > 0 ? remaining : candidates;

  return gender === "female" ? pool[0] : pool[pool.length - 1];
}

export function speak(text: string, lang: "zh-TW" | "en-US") {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const settings = getSpeechSettings();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = settings.rate;

  const voice = pickVoiceForGender(lang, settings.voiceGender);
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
