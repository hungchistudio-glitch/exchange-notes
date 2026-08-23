import {
  SPEECH_TAGS,
  getLanguageBySpeechTag,
  type SpeechTag,
} from "@/lib/languages";

export type VoiceGender = "female" | "male";

/**
 * The languages speech can be asked for.
 *
 * An alias of SpeechTag rather than its own list: every per-language decision
 * below — which tags count as this language, how its voices are ordered — is
 * read from lib/languages.ts, so a language becomes speakable by gaining a row
 * there rather than by being spelled out again here.
 */
export type SpeechLanguage = SpeechTag;

export type SpeechSettings = {
  rate: number;
  voiceGender: VoiceGender;
  /**
   * A voice the user picked by name, per language.
   *
   * Guessing gender from a voice name is unavoidable as a default — the Web
   * Speech API does not expose gender — but it is a guess, and on devices
   * where a language ships a single voice no guess can succeed. An explicit
   * choice overrides it, which is the only way to be certain.
   */
  voiceURIs: Partial<Record<SpeechLanguage, string>>;
};

const SETTINGS_STORAGE_KEY = "speech-settings";

const DEFAULT_SETTINGS: SpeechSettings = {
  rate: 0.75,
  voiceGender: "female",
  voiceURIs: {},
};

/**
 * Cached so that repeated reads return the same object.
 *
 * useSyncExternalStore compares snapshots by identity, so a getter that
 * parsed localStorage afresh on every call would hand React a new object
 * each render and spin forever. Nothing else depended on re-reading storage
 * per call — the value only changes when this module writes it, or when
 * another tab does.
 */
let cachedSettings: SpeechSettings | null = null;

const settingsListeners = new Set<() => void>();

function readSettingsFromStorage(): SpeechSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<SpeechSettings>;

    const voiceURIs: Partial<Record<SpeechLanguage, string>> = {};

    if (parsed.voiceURIs && typeof parsed.voiceURIs === "object") {
      for (const language of SPEECH_TAGS) {
        const uri = (parsed.voiceURIs as Record<string, unknown>)[language];
        if (typeof uri === "string" && uri) voiceURIs[language] = uri;
      }
    }

    return {
      rate:
        typeof parsed.rate === "number" ? parsed.rate : DEFAULT_SETTINGS.rate,
      voiceGender:
        parsed.voiceGender === "male" || parsed.voiceGender === "female"
          ? parsed.voiceGender
          : DEFAULT_SETTINGS.voiceGender,
      voiceURIs,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function notifySettingsListeners() {
  for (const listener of settingsListeners) listener();
}

export function getSpeechSettings(): SpeechSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  cachedSettings ??= readSettingsFromStorage();
  return cachedSettings;
}

/** Server snapshot for useSyncExternalStore: never touches storage. */
export function getDefaultSpeechSettings(): SpeechSettings {
  return DEFAULT_SETTINGS;
}

export function subscribeToSpeechSettings(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  settingsListeners.add(listener);

  // Another tab changing the setting has to invalidate this tab's cache,
  // otherwise the stale copy would outlive the change.
  function handleStorage(event: StorageEvent) {
    if (event.key !== SETTINGS_STORAGE_KEY) return;
    cachedSettings = null;
    notifySettingsListeners();
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    settingsListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function setSpeechSettings(settings: SpeechSettings): void {
  if (typeof window === "undefined") return;

  cachedSettings = settings;

  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // Storage can fail (private mode, quota). Safe to ignore.
  }

  notifySettingsListeners();
}

// Browsers don't expose voice gender as data — only as part of the
// human-readable name, and that varies a lot by OS/browser. These are
// best-effort hints, not a guarantee.
/**
 * Voice names observed on a real device rather than assumed.
 *
 * The Mandarin (Taiwan) entries are Apple's Eloquence family, which iOS
 * groups under that language and which — unlike Meijia — includes male
 * voices. Meijia appears both with and without a hyphen depending on the
 * reporting surface, so both spellings are listed; an earlier version had
 * only "meijia" and never matched the hyphenated name the device reports.
 */
const FEMALE_NAME_HINTS = [
  "female",
  "woman",
  "samantha",
  "susan",
  "ting-ting",
  "tingting",
  "婷婷",
  "美嘉",
  "meijia",
  "mei-jia",
  "grandma",
  "shelley",
  "sandy",
  "flo",
  "bobo",
  "lanlan",
  "panpan",
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

/**
 * Bumped whenever the browser reports a different set of installed voices.
 *
 * Exposed as a number rather than the array itself because
 * useSyncExternalStore compares snapshots by identity: a getter returning a
 * fresh array each call would re-render forever. Callers watch this and
 * recompute their own list from it.
 */
let voicesVersion = 0;

const voicesListeners = new Set<() => void>();

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoices = window.speechSynthesis.getVoices();
    voicesVersion += 1;
    for (const listener of voicesListeners) listener();
  });
}

export function subscribeToVoices(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;

  voicesListeners.add(listener);
  return () => {
    voicesListeners.delete(listener);
  };
}

export function getVoicesVersion() {
  return voicesVersion;
}

export function getInitialVoicesVersion() {
  return 0;
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

/**
 * Narrows a set of same-language voices to the requested gender.
 *
 * Runs before quality selection, not after: pickBestQualityVoice prefers a
 * "Google" cloud voice above everything else, so filtering afterwards would
 * let that preference silently override the user's choice.
 */
/**
 * A voice counts as a gender only if that gender's hints match and the other
 * gender's do not.
 *
 * The lists overlap as substrings — "female" contains "male", "woman"
 * contains "man" — so testing the male list alone made a voice named
 * "Chinese Female 1" match as male. Only the male setting appeared broken,
 * because the collision runs in one direction.
 */
function matchesHints(name: string, hints: string[]) {
  return hints.some((hint) => name.includes(hint));
}

function isNamedForGender(voice: SpeechSynthesisVoice, gender: VoiceGender) {
  const name = voice.name.toLowerCase();
  const female = matchesHints(name, FEMALE_NAME_HINTS);

  if (gender === "female") return female;

  return matchesHints(name, MALE_NAME_HINTS) && !female;
}

function narrowToGender(
  voices: SpeechSynthesisVoice[],
  gender: VoiceGender
): SpeechSynthesisVoice[] {
  // Novelty voices are excluded first so a joke voice can never win a
  // gender match on its name alone.
  const normalSounding = voices.filter((voice) => !isNoveltyVoice(voice));
  const pool = normalSounding.length > 0 ? normalSounding : voices;

  const other: VoiceGender = gender === "female" ? "male" : "female";

  const matching = pool.filter((voice) => isNamedForGender(voice, gender));
  if (matching.length > 0) return matching;

  // Nothing named for the requested gender. Drop anything clearly named for
  // the other one so the two settings still differ where the device allows.
  const neutral = pool.filter((voice) => !isNamedForGender(voice, other));

  return neutral.length > 0 ? neutral : pool;
}

/**
 * Narrows voices sharing a primary subtag to the ones that are actually this
 * language, in order of how well they match.
 *
 * Two behaviours that used to be separate functions, now one table lookup.
 *
 * For most languages this is only about region: without it, "en-US" means
 * nothing beyond "starts with en", every English voice on the device is an
 * equal candidate, and which one wins is decided by the order the platform
 * happens to list them in. On a Mac with the full voice set that hands en-US
 * requests a British voice, which is both wrong and — see the note in speak()
 * — a way to get no sound at all on iOS.
 *
 * For Chinese it is about script, which is why the fallbacks exist: zh-CN and
 * zh-HK voices match the same prefix but read Traditional text with
 * Mandarin or Cantonese pronunciation. An exact zh-TW tag wins, then any tag
 * mentioning "tw" or "hant", then whatever zh voice exists rather than
 * playing nothing. Those fragments live in lib/languages.ts now, not here.
 */
function narrowToLanguageTag(
  candidates: SpeechSynthesisVoice[],
  lang: SpeechLanguage
): SpeechSynthesisVoice[] {
  const wanted = lang.toLowerCase();

  const exact = candidates.filter(
    (voice) => voice.lang.toLowerCase().replace("_", "-") === wanted
  );
  if (exact.length > 0) return exact;

  for (const fragment of getLanguageBySpeechTag(lang).voiceTagFallbacks) {
    const matching = candidates.filter((voice) =>
      voice.lang.toLowerCase().includes(fragment)
    );
    if (matching.length > 0) return matching;
  }

  return candidates;
}

/**
 * The primary subtag — "en" from "en-US", "zh" from "zh-TW".
 *
 * Matching by prefix rather than the full tag is what actually makes Chinese
 * playback reliable: many devices register their Traditional Chinese voice
 * under "zh-TW", "zh-Hant-TW", or even "cmn-Hant-TW" rather than the literal
 * string we ask for, and browsers often play nothing at all — no error — when
 * utterance.lang doesn't exactly match an installed voice and no explicit
 * voice is set.
 */
function primarySubtag(lang: SpeechLanguage): string {
  return lang.toLowerCase().split("-")[0];
}

/**
 * The app's single voice selector.
 *
 * There used to be two. One honoured the gender setting but skipped the
 * Chinese dialect tiering, so zh-CN and zh-HK voices could read Traditional
 * Chinese. The other did the tiering and quality ranking but took no gender
 * argument at all — and that was the one behind word-card playback, which is
 * why changing the voice setting appeared to do nothing across most of the
 * app. Each path was missing what the other had.
 *
 * Order matters: dialect first, because a Cantonese voice reading Mandarin is
 * a worse outcome than a voice of the wrong gender; then gender; then quality
 * within whatever is left.
 */
export function selectVoice(
  lang: SpeechLanguage,
  gender: VoiceGender,
  preferredVoiceURI?: string
): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();

  const prefix = primarySubtag(lang);

  /*
   * An explicitly chosen voice is not a preference to be balanced against
   * dialect and quality heuristics — it is the answer. But it is the answer
   * to "which voice for *this* language", and a pin only ever applies to the
   * language it was made under.
   *
   * The language check is the part that was missing. Preferences are stored
   * per language and survive everything: switching what you are learning,
   * reinstalling voices, moving to another device. A pin left pointing at a
   * voice the platform has since re-registered under another language would
   * otherwise win outright and read Italian in it — the one case where
   * honouring the setting produces the exact thing the setting exists to
   * prevent.
   */
  if (preferredVoiceURI) {
    const chosen = voices.find(
      (voice) =>
        voice.voiceURI === preferredVoiceURI &&
        voice.lang.toLowerCase().startsWith(prefix),
    );
    if (chosen) return chosen;
  }

  const candidates = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(prefix)
  );

  if (candidates.length === 0) return null;

  const dialectMatched = narrowToLanguageTag(candidates, lang);

  return pickBestQualityVoice(narrowToGender(dialectMatched, gender));
}

/**
 * Resolves the voice for a language using the user's saved gender setting.
 * Existing callers keep their signature and pick up the setting for free.
 */
export function getVoiceForLanguage(
  lang: SpeechLanguage
): SpeechSynthesisVoice | null {
  const settings = getSpeechSettings();
  return selectVoice(lang, settings.voiceGender, settings.voiceURIs[lang]);
}

/**
 * Whether this device has any voice matching a gender for a language.
 *
 * iOS is the reason this exists. Its Mandarin (Taiwan) male voices belong to
 * Apple's Eloquence family, which the system exposes to native apps but not
 * to Safari — a web app sees only Meijia. Asking for a male Chinese voice
 * there is not a preference the app can satisfy, and silently returning a
 * female one is what made the setting look broken.
 */
export function hasVoiceForGender(
  lang: SpeechLanguage,
  gender: VoiceGender
): boolean {
  const prefix = primarySubtag(lang);

  const candidates = getAvailableVoices().filter((voice) =>
    voice.lang.toLowerCase().startsWith(prefix)
  );

  return candidates.some((voice) => isNamedForGender(voice, gender));
}

/**
 * Voices this device can actually use for a language, in the order the
 * selector would consider them. Surfaced in settings so the user can see what
 * exists rather than being told a gender that may not be installed.
 */
export function listVoicesForLanguage(
  lang: SpeechLanguage
): SpeechSynthesisVoice[] {
  const prefix = primarySubtag(lang);

  // iOS Safari reports some voices twice with the same voiceURI, which showed
  // up as duplicate rows that both highlighted when either was picked — and
  // as duplicate React keys.
  const seen = new Set<string>();

  const candidates = getAvailableVoices().filter((voice) => {
    if (!voice.lang.toLowerCase().startsWith(prefix)) return false;
    if (seen.has(voice.voiceURI)) return false;

    seen.add(voice.voiceURI);
    return true;
  });

  // Only languages with script fallbacks are reordered — for the rest a
  // different region is an accent, and the platform's own order is as good an
  // answer as any. Today that means Chinese and nothing else, which is what
  // this did before the condition was read from the table.
  if (getLanguageBySpeechTag(lang).voiceTagFallbacks.length === 0) {
    return candidates;
  }

  // Traditional-first, but every zh voice is still listed: a user who only
  // has zh-CN voices should be able to see and choose one rather than find
  // the list empty.
  const preferred = narrowToLanguageTag(candidates, lang);
  const rest = candidates.filter((voice) => !preferred.includes(voice));

  return [...preferred, ...rest];
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
  lang: SpeechLanguage,
  callbacks?: SpeechCallbacks,
  rate?: number,
) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) {
    callbacks?.onError?.();
    return;
  }

  const sequence = ++speakSequence;

  /*
   * Whether anything is actually in the queue right now.
   *
   * Read before cancel(), because cancel() is what makes it false — and the
   * answer decides which of the two paths at the bottom of this function is
   * taken. See the note there.
   */
  const wasBusy =
    window.speechSynthesis.speaking || window.speechSynthesis.pending;

  if (wasBusy) window.speechSynthesis.cancel();

  const settings = getSpeechSettings();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate ?? settings.rate;

  const voice = selectVoice(lang, settings.voiceGender, settings.voiceURIs[lang]);
  if (voice) {
    utterance.voice = voice;

    /*
     * The utterance's language has to be the assigned voice's own.
     *
     * Leaving `lang` at what the caller asked for while handing the utterance
     * a voice from a different region is not a harmless mismatch — on WebKit
     * it is one of the documented ways to get silence with no error event,
     * because the platform resolves a voice from `lang` and then finds the
     * explicitly assigned one inconsistent with it. Once a voice has been
     * chosen it is the more specific answer, so it wins.
     */
    utterance.lang = voice.lang;
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

  /*
   * Two paths, and which one is taken decides whether iOS makes any sound at
   * all.
   *
   * The delayed path exists for a real race: Chrome, Edge and Safari can
   * silently drop an utterance queued in the same tick as cancel(), or let
   * whatever was just cancelled keep sounding for a moment before the new one
   * starts. Tapping quickly between sound cards then reads as "I tapped F and
   * heard something else" — the previous card bleeding through. A short delay
   * after cancel() gives the queue time to clear.
   *
   * But that delay also breaks WebKit's other rule: the first
   * speechSynthesis.speak() of a session has to happen inside the task the
   * user's tap started. Deferring it by even 60ms severs that association, and
   * WebKit's response is to do nothing — no sound, no error event, nothing in
   * the console. Every later tap goes down the same path, so the engine never
   * unlocks and the whole screen stays mute for the session. That is what made
   * the Pronunciation Lab's English letters silent while its Zhuyin sounds
   * played perfectly: Zhuyin has recorded audio files and never touches speech
   * synthesis at all, so it was never subject to either rule.
   *
   * The two only conflict when both apply, and they cannot: the race needs
   * something already in the queue, and the gesture rule only binds when
   * nothing is. So the queue's own state picks the path — speak immediately
   * when there is nothing to cancel, defer when there is.
   */
  if (!wasBusy) {
    window.speechSynthesis.speak(utterance);
    return;
  }

  // If a newer speak() call has started during the delay — the user tapped
  // something else — this one bails rather than firing late and stepping on it.
  window.setTimeout(() => {
    if (sequence !== speakSequence) return;
    window.speechSynthesis.speak(utterance);
  }, 60);
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
