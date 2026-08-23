import { getInterfaceLanguageMeta } from "@/lib/languages";

export type AppFontSize = "small" | "medium" | "large";

const FONT_SIZE_STORAGE_KEY = "exchange-notes-font-size";
const FONT_SIZE_EVENT = "exchange-notes-font-size-change";

const ROOT_FONT_SIZES: Record<AppFontSize, string> = {
  small: "15px",
  medium: "16px",
  large: "17px",
};

export const DEFAULT_APP_FONT_SIZE: AppFontSize = "medium";

export function isAppFontSize(
  value: unknown,
): value is AppFontSize {
  return (
    value === "small" ||
    value === "medium" ||
    value === "large"
  );
}

export function getAppFontSize(): AppFontSize {
  if (typeof window === "undefined") {
    return DEFAULT_APP_FONT_SIZE;
  }

  const saved = window.localStorage.getItem(
    FONT_SIZE_STORAGE_KEY,
  );

  return isAppFontSize(saved)
    ? saved
    : DEFAULT_APP_FONT_SIZE;
}

export function applyAppFontSize(
  size: AppFontSize,
) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.appFontSize =
    size;

  document.documentElement.style.fontSize =
    ROOT_FONT_SIZES[size];
}

export function setAppFontSize(
  size: AppFontSize,
) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    FONT_SIZE_STORAGE_KEY,
    size,
  );

  applyAppFontSize(size);

  window.dispatchEvent(
    new CustomEvent<AppFontSize>(
      FONT_SIZE_EVENT,
      {
        detail: size,
      },
    ),
  );
}

export function subscribeToAppFontSize(
  listener: (size: AppFontSize) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleChange(event: Event) {
    const customEvent =
      event as CustomEvent<AppFontSize>;

    if (isAppFontSize(customEvent.detail)) {
      listener(customEvent.detail);
    }
  }

  function handleStorage(
    event: StorageEvent,
  ) {
    if (
      event.key === FONT_SIZE_STORAGE_KEY &&
      isAppFontSize(event.newValue)
    ) {
      listener(event.newValue);
    }
  }

  window.addEventListener(
    FONT_SIZE_EVENT,
    handleChange,
  );

  window.addEventListener(
    "storage",
    handleStorage,
  );

  return () => {
    window.removeEventListener(
      FONT_SIZE_EVENT,
      handleChange,
    );

    window.removeEventListener(
      "storage",
      handleStorage,
    );
  };
}

/* =========================================================
   Daily study goal (new words)
   ========================================================= */

/*
 * The daily goal, counted in new words rather than in minutes.
 *
 * Minutes was a number nothing in the app could measure — you could ask for
 * thirty of them and no screen ever checked. Words is something already being
 * counted: Yumi's cookie tray fills from the words added today, so the setting
 * now drives behaviour instead of only describing an intention.
 *
 * The ladder starts at 3 because that is the milestone Yumi already used, so
 * the lowest setting matches what the app was doing before anyone touched it.
 */
export type DailyGoalWords = 3 | 5 | 10 | 20 | 33;

/*
 * A new key, deliberately. The old one holds minutes, and 5, 10 and 20 are
 * valid in both ladders — reusing it would silently reinterpret somebody's
 * "20 minutes" as "20 words" without them choosing that. A fresh key lets
 * everyone land on the default once and pick again.
 */
const DAILY_GOAL_STORAGE_KEY = "exchange-notes-daily-word-goal";
const DAILY_GOAL_EVENT = "exchange-notes-daily-goal-change";

export const DEFAULT_DAILY_GOAL_WORDS: DailyGoalWords = 10;

export function isDailyGoalWords(
  value: unknown,
): value is DailyGoalWords {
  return (
    value === 3 || value === 5 || value === 10 || value === 20 || value === 33
  );
}

export function getDailyGoalWords(): DailyGoalWords {
  if (typeof window === "undefined") {
    return DEFAULT_DAILY_GOAL_WORDS;
  }

  const saved = window.localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
  const parsed = saved === null ? null : Number(saved);

  return isDailyGoalWords(parsed) ? parsed : DEFAULT_DAILY_GOAL_WORDS;
}

export function setDailyGoalWords(words: DailyGoalWords) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(DAILY_GOAL_STORAGE_KEY, String(words));

  window.dispatchEvent(
    new CustomEvent<DailyGoalWords>(DAILY_GOAL_EVENT, {
      detail: words,
    }),
  );
}

export function subscribeToDailyGoalWords(
  listener: (words: DailyGoalWords) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleChange(event: Event) {
    const customEvent = event as CustomEvent<DailyGoalWords>;

    if (isDailyGoalWords(customEvent.detail)) {
      listener(customEvent.detail);
    }
  }

  function handleStorage(event: StorageEvent) {
    const parsed = event.newValue === null ? null : Number(event.newValue);

    if (event.key === DAILY_GOAL_STORAGE_KEY && isDailyGoalWords(parsed)) {
      listener(parsed);
    }
  }

  window.addEventListener(DAILY_GOAL_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(DAILY_GOAL_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

/* =========================================================
   Interface language
   ========================================================= */

/**
 * The languages the app itself speaks.
 *
 * Spelled out rather than BCP-47, unlike the learning axis: these values are
 * already written into localStorage and profiles.app_preferences on every
 * account, and re-encoding a setting that is stored buys nothing. See the
 * note at the top of lib/languages.ts on why the two axes stay apart.
 *
 * Adding one here is a commitment, not a flag: lib/i18n/types.ts requires a
 * complete TranslationDictionary, so the build fails until every string
 * exists. That is the point — an interface half in English is worse than an
 * interface honestly in another language.
 */
export type InterfaceLanguage =
  | "english"
  | "traditional-chinese"
  | "spanish"
  | "french"
  | "italian";

const INTERFACE_LANGUAGES: readonly InterfaceLanguage[] = [
  "english",
  "traditional-chinese",
  "spanish",
  "french",
  "italian",
];

/*
 * The language lives in a cookie, and in localStorage behind it.
 *
 * The cookie is the one the server reads. Every string in the app comes from
 * this setting, so a server that cannot see it renders the whole interface in
 * English and the browser then re-renders the whole interface in the reader's
 * own language — a hydration mismatch across the entire tree, which React
 * resolves by throwing the server's work away and rebuilding from scratch.
 * That is what the flash on every launch was.
 *
 * localStorage stays as the migration path for devices that stored a language
 * before this cookie existed, and as the answer to a cookie the browser
 * declines to keep. Reading falls through in that order; writing does both.
 */
export const INTERFACE_LANGUAGE_COOKIE =
  "exchange-notes-interface-language";

const INTERFACE_LANGUAGE_STORAGE_KEY =
  "exchange-notes-interface-language";

const INTERFACE_LANGUAGE_EVENT =
  "exchange-notes-interface-language-change";

// A year, matching interface mode: a language choice outlives any realistic
// gap between visits.
const INTERFACE_LANGUAGE_COOKIE_MAX_AGE =
  60 * 60 * 24 * 365;

export const DEFAULT_INTERFACE_LANGUAGE: InterfaceLanguage = "english";

export function isInterfaceLanguage(
  value: unknown,
): value is InterfaceLanguage {
  // Read off the list rather than repeated as a chain of comparisons, which
  // is how the fourth language gets added to the type and forgotten here —
  // and a guard that has not heard of a language silently resets anyone
  // using it back to English on their next visit.
  return (
    typeof value === "string" &&
    (INTERFACE_LANGUAGES as readonly string[]).includes(value)
  );
}

function readInterfaceLanguageCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${INTERFACE_LANGUAGE_COOKIE}=([^;]*)`,
    ),
  );

  return match
    ? decodeURIComponent(match[1])
    : null;
}

function writeInterfaceLanguageCookie(
  language: InterfaceLanguage,
) {
  document.cookie =
    `${INTERFACE_LANGUAGE_COOKIE}=${language}; path=/; max-age=` +
    `${INTERFACE_LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function getInterfaceLanguage(): InterfaceLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_INTERFACE_LANGUAGE;
  }

  const cookie = readInterfaceLanguageCookie();

  if (isInterfaceLanguage(cookie)) return cookie;

  const saved = window.localStorage.getItem(
    INTERFACE_LANGUAGE_STORAGE_KEY,
  );

  if (!isInterfaceLanguage(saved)) {
    return DEFAULT_INTERFACE_LANGUAGE;
  }

  /*
   * A device that chose its language before the cookie existed. Writing it
   * through here rather than waiting for the next visit to Settings is what
   * makes this the *last* load that renders in the wrong language — the
   * server can see the choice from the very next request.
   */
  writeInterfaceLanguageCookie(saved);

  return saved;
}

export function applyInterfaceLanguage(
  language: InterfaceLanguage,
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.dataset.interfaceLanguage = language;
  // Read from the language table rather than decided here, so a fourth
  // interface language needs a row and not an extra branch.
  root.lang = getInterfaceLanguageMeta(language).htmlLang;
}

export function setInterfaceLanguage(
  language: InterfaceLanguage,
) {
  if (typeof window === "undefined") return;

  // The cookie first: it is the copy the next server render reads, and the
  // one that decides whether that render is in the right language.
  writeInterfaceLanguageCookie(language);

  window.localStorage.setItem(
    INTERFACE_LANGUAGE_STORAGE_KEY,
    language,
  );

  applyInterfaceLanguage(language);

  window.dispatchEvent(
    new CustomEvent<InterfaceLanguage>(
      INTERFACE_LANGUAGE_EVENT,
      {
        detail: language,
      },
    ),
  );
}

export function subscribeToInterfaceLanguage(
  listener: (language: InterfaceLanguage) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleChange(event: Event) {
    const customEvent =
      event as CustomEvent<InterfaceLanguage>;

    if (isInterfaceLanguage(customEvent.detail)) {
      listener(customEvent.detail);
    }
  }

  function handleStorage(event: StorageEvent) {
    if (
      event.key === INTERFACE_LANGUAGE_STORAGE_KEY &&
      isInterfaceLanguage(event.newValue)
    ) {
      listener(event.newValue);
    }
  }

  window.addEventListener(
    INTERFACE_LANGUAGE_EVENT,
    handleChange,
  );

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(
      INTERFACE_LANGUAGE_EVENT,
      handleChange,
    );

    window.removeEventListener(
      "storage",
      handleStorage,
    );
  };
}

/* =========================================================
   Interface mode
   ========================================================= */

export type InterfaceMode = "standard" | "yumi-cosmic";

/*
 * A cookie, like the interface language above and unlike the rest.
 *
 * The preferences that stay in localStorage only change how something already
 * on screen is painted, so correcting them after hydration is invisible.
 * These two do not: language changes every string in the app, and mode picks
 * between two different component trees — the standard home and the Command
 * Deck. Both have to be right in the HTML that arrives. localStorage does not
 * exist during a server render; a cookie does, so the mode is already decided
 * when the document lands, and there is no mismatch to reconcile and no
 * standard-then-cosmic flash to sit through.
 */
export const INTERFACE_MODE_COOKIE = "exchange-notes-interface-mode";

const INTERFACE_MODE_EVENT = "exchange-notes-interface-mode-change";

// A year, so the choice outlives any realistic gap between visits.
const INTERFACE_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const DEFAULT_INTERFACE_MODE: InterfaceMode = "standard";

export function isInterfaceMode(value: unknown): value is InterfaceMode {
  return value === "standard" || value === "yumi-cosmic";
}

function readInterfaceModeCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${INTERFACE_MODE_COOKIE}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

export function getInterfaceMode(): InterfaceMode {
  if (typeof document === "undefined") {
    return DEFAULT_INTERFACE_MODE;
  }

  const saved = readInterfaceModeCookie();

  return isInterfaceMode(saved) ? saved : DEFAULT_INTERFACE_MODE;
}

export function applyInterfaceMode(mode: InterfaceMode) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.interfaceMode = mode;
}

export function setInterfaceMode(mode: InterfaceMode) {
  if (typeof document === "undefined") return;

  document.cookie =
    `${INTERFACE_MODE_COOKIE}=${mode}; path=/; max-age=` +
    `${INTERFACE_MODE_COOKIE_MAX_AGE}; SameSite=Lax`;

  applyInterfaceMode(mode);

  window.dispatchEvent(
    new CustomEvent<InterfaceMode>(INTERFACE_MODE_EVENT, {
      detail: mode,
    }),
  );
}

/*
 * No "storage" listener here, unlike the sections above: cookies do not fire
 * one. Two tabs open at once therefore stay on whichever mode each was showing
 * until they next load, which is the same behaviour as any other cookie-backed
 * setting and not worth polling for.
 */
export function subscribeToInterfaceMode(
  listener: (mode: InterfaceMode) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleChange(event: Event) {
    const customEvent = event as CustomEvent<InterfaceMode>;

    if (isInterfaceMode(customEvent.detail)) {
      listener(customEvent.detail);
    }
  }

  window.addEventListener(INTERFACE_MODE_EVENT, handleChange);

  return () => {
    window.removeEventListener(INTERFACE_MODE_EVENT, handleChange);
  };
}

/* =========================================================
   Tutorial
   ========================================================= */

const TUTORIAL_PENDING_STORAGE_KEY = "exchange-notes-tutorial-pending";
const TUTORIAL_PENDING_EVENT = "exchange-notes-tutorial-pending-change";

/*
 * Whether the tour is waiting to be shown, which is set once when onboarding
 * completes and cleared the moment the tour is dismissed.
 *
 * Deliberately not "has this device seen it". That phrasing defaults to
 * showing, so every existing account would have been handed the tour the next
 * time they opened the app — they have been using it for months. Asking
 * instead whether someone has just finished signing up defaults to silence,
 * and only a genuinely new account can answer yes.
 *
 * Local rather than a profiles column: it is answered once, seconds after
 * onboarding, on the device onboarding happened on, and it keeps a cosmetic
 * flag out of a production migration.
 */
export function getTutorialPending(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(TUTORIAL_PENDING_STORAGE_KEY) === "true"
  );
}

export function setTutorialPending(pending: boolean) {
  if (typeof window === "undefined") return;

  if (pending) {
    window.localStorage.setItem(TUTORIAL_PENDING_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(TUTORIAL_PENDING_STORAGE_KEY);
  }

  window.dispatchEvent(
    new CustomEvent<boolean>(TUTORIAL_PENDING_EVENT, {
      detail: pending,
    }),
  );
}

export function subscribeToTutorialPending(
  listener: (pending: boolean) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleChange(event: Event) {
    const customEvent = event as CustomEvent<boolean>;

    if (typeof customEvent.detail === "boolean") {
      listener(customEvent.detail);
    }
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === TUTORIAL_PENDING_STORAGE_KEY) {
      listener(event.newValue === "true");
    }
  }

  window.addEventListener(TUTORIAL_PENDING_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(TUTORIAL_PENDING_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}
