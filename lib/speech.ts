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

// macOS/iOS ship a set of "novelty" system voices (Albert, Bad News, Bahh,
// Bells, Boing, Bubbles, Cellos, Good News, Jester, Organ, Superstar,
// Trinoids, Whisper, Wobble, Zarvox, and older ones like Bruce/Fred/Ralph/
// Kathy/Princess/Junior/Deranged/Hysterical) that are all tagged with a
// normal "en-US" lang and pass every other filter here, but deliberately
// mangle pronunciation into something robotic/alien/comically pitched —
// not remotely close to normal speech. If the "real" voices (Samantha,
// Alex, a Google voice, etc.) aren't installed/enabled for some reason,
// these can end up as the only "en" candidates and get picked, which reads
// as "every English word sounds completely wrong" even though the text
// being spoken is correct. They're excluded from the normal pool and only
// used as an absolute last resort (better than no audio at all).
const NOVELTY_VOICE_NAMES = [
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "deranged",
  "good news",
  "hysterical",
  "jester",
  "junior",
  "kathy",
  "organ",
  "princess",
  "ralph",
  "superstar",
  "trinoids",
  "whisper",
  "wobble",
  "zarvox",
  "bruce",
  "fred",
];

function isNoveltyVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  return NOVELTY_VOICE_NAMES.some((noveltyName) => name.includes(noveltyName));
}

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

// Plain (no gender preference) voice lookup for callers that just need
// *a* working voice for the language — e.g. Daily News, which has its own
// independent speed control and doesn't use the gender setting above.
// Matching by lang *prefix* (e.g. "zh") rather than an exact string is
// what actually makes Chinese playback reliable: many devices register
// their Traditional Chinese voice under "zh-TW", "zh-Hant-TW", or even
// "cmn-Hant-TW" rather than the literal string we ask for, and browsers
// often play nothing at all — no error — when utterance.lang doesn't
// exactly match an installed voice and no explicit voice is set.
// Among a set of same-language candidate voices, prefer the one that will
// actually sound least robotic. Chrome/Edge ship both a cloud-quality
// "Google …" voice and a much flatter local/system voice for the same
// language — when both are installed the Google one is dramatically more
// natural. Local "Compact" voices (common on macOS/iOS for languages you
// haven't downloaded the full voice pack for) are the opposite: noticeably
// more synthetic than a normal system voice, so they're avoided unless
// nothing else matches.
function pickBestQualityVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice {
  const cloudVoice = voices.find((voice) =>
    voice.name.toLowerCase().includes("google")
  );
  if (cloudVoice) return cloudVoice;

  const nonCompact = voices.filter(
    (voice) => !voice.name.toLowerCase().includes("compact")
  );

  // Prefer a normal-sounding voice over a novelty one whenever any normal
  // option exists at all — see the NOVELTY_VOICE_NAMES comment above.
  const normalSounding = nonCompact.filter((voice) => !isNoveltyVoice(voice));
  if (normalSounding.length > 0) return normalSounding[0];

  return nonCompact[0] ?? voices[0];
}

export function getVoiceForLanguage(
  lang: "zh-TW" | "en-US"
): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  const langPrefix = lang.slice(0, 2).toLowerCase();

  const candidates = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(langPrefix)
  );

  if (candidates.length === 0) return null;
  if (lang !== "zh-TW") return pickBestQualityVoice(candidates);

  // For Chinese, "starts with zh" alone isn't enough — zh-CN and zh-HK
  // voices match that same prefix but use Mandarin/Cantonese pronunciation
  // that differs from Taiwan Mandarin, which reads as mispronunciations to
  // a zh-TW learner. Prefer, in order: an exact zh-TW tag, then any tag
  // that mentions "tw" or "hant" (Traditional), then fall back to
  // whatever zh voice is available rather than showing no audio at all.
  // Within whichever tier matches, pick the best-sounding voice available.
  const exactTw = candidates.filter(
    (voice) => voice.lang.toLowerCase() === "zh-tw"
  );
  if (exactTw.length > 0) return pickBestQualityVoice(exactTw);

  const traditional = candidates.filter((voice) => {
    const tag = voice.lang.toLowerCase();
    return tag.includes("tw") || tag.includes("hant");
  });
  if (traditional.length > 0) return pickBestQualityVoice(traditional);

  return pickBestQualityVoice(candidates);
}

function pickVoiceForGender(
  lang: "zh-TW" | "en-US",
  gender: VoiceGender
): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  const langPrefix = lang.slice(0, 2).toLowerCase();

  const allCandidates = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(langPrefix)
  );

  if (allCandidates.length === 0) return null;

  // Exclude novelty/joke system voices (Albert, Zarvox, Bad News, etc. —
  // see NOVELTY_VOICE_NAMES) from the normal pool whenever there's at
  // least one non-novelty candidate. Without this, if the "real" voices
  // for a language aren't installed/enabled, one of these could get
  // picked and every word in that language would come out mangled —
  // exactly the "every English sound is wrong" failure mode reported
  // against this Pronunciation Lab.
  const normalSounding = allCandidates.filter((voice) => !isNoveltyVoice(voice));
  const candidates = normalSounding.length > 0 ? normalSounding : allCandidates;

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

export type SpeechCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

// Bumped on every speak() call so a delayed speak() from an interaction the
// user has since moved on from can detect it's stale and bail instead of
// firing late.
let speakSequence = 0;

export function speak(
  text: string,
  lang: "zh-TW" | "en-US",
  callbacks?: SpeechCallbacks,
  rate?: number,
) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) {
    callbacks?.onError?.();
    return;
  }

  const sequence = ++speakSequence;

  window.speechSynthesis.cancel();

  const settings = getSpeechSettings();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate ?? settings.rate;

  const voice = pickVoiceForGender(lang, settings.voiceGender);
  if (voice) {
    utterance.voice = voice;
  }

  // Cheap, always-on diagnostic: if playback ever sounds wrong again,
  // checking the browser console for this line immediately shows whether
  // it's a text/data bug (wrong `text` here) or a voice-selection bug
  // (wrong/no `voice`, e.g. a novelty system voice slipping through) —
  // the two look identical from the UI but need completely different
  // fixes.
  if (typeof console !== "undefined") {
    console.debug("[speak]", {
      text,
      lang,
      voice: voice ? `${voice.name} (${voice.lang})` : "(no explicit voice — browser default)",
    });
  }

  if (callbacks?.onStart) utterance.onstart = () => callbacks.onStart?.();
  if (callbacks?.onEnd) utterance.onend = () => callbacks.onEnd?.();
  if (callbacks?.onError) utterance.onerror = () => callbacks.onError?.();

  // Chrome/Edge/Safari have a well-known race: calling speak() in the same
  // tick as cancel() can silently drop the new utterance, or let whatever
  // was *just* cancelled keep making sound for a moment before the new one
  // actually starts. When tapping between different sound cards quickly,
  // that reads as "I tapped F but heard something else" — the previous
  // card's audio bleeding through, or the new one never starting so the
  // old one's tail is the last thing heard. A short delay after cancel()
  // before queuing gives every browser's speech queue time to actually
  // clear first. If a newer speak() call has started in the meantime (the
  // user tapped something else during the delay), this one bails instead
  // of firing late and stepping on it.
  window.setTimeout(() => {
    if (sequence !== speakSequence) return;
    window.speechSynthesis.speak(utterance);
  }, 60);
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
