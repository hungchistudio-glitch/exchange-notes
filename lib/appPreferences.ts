import { getInterfaceLanguageMeta } from "@/lib/languages";

export type AppFontSize = "small" | "medium" | "large";

/*
 * A cookie, with localStorage behind it, for the same reason as the interface
 * language further down: the server has to be able to see this one.
 *
 * Font size is the root font size, so it is not one element's problem — every
 * rem in the app is measured against it. Applied only after hydration, a
 * reader on "small" gets the whole interface laid out at 16px and then
 * relaid at 15px, on every single load. The cookie lets the root element
 * carry the right size in the HTML that arrives.
 */
export const APP_FONT_SIZE_COOKIE = "exchange-notes-font-size";

const FONT_SIZE_STORAGE_KEY = "exchange-notes-font-size";
const FONT_SIZE_EVENT = "exchange-notes-font-size-change";

// A year, matching every other preference the server reads.
const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readPreferenceCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function writePreferenceCookie(
  name: string,
  value: string,
) {
  if (typeof document === "undefined") return;

  document.cookie =
    `${name}=${value}; path=/; max-age=` +
    `${PREFERENCE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/*
 * 14 / 16 / 19, not 15 / 16 / 17.
 *
 * The old range was one pixel either side of the default — about six
 * percent — and it moved ordinary body text by 1.75px between the smallest
 * setting and the largest. Measured in the browser rather than argued about:
 * a reader switching from small to large could not see that anything had
 * happened, and reported exactly that.
 *
 * Half the reason was worse. 576 font sizes across the app were written in
 * hard pixels, so between 47 and 80 percent of the text on a given screen
 * ignored the setting completely however far it was moved. Those are rem
 * now, which is what makes widening this worth doing: the whole screen
 * answers, not a scattered third of it.
 *
 * The most common body size is 13px, which now travels 11.4px to 15.4px —
 * a 35 percent range. Large enough to be the point of the setting, small
 * enough that a card with a fixed height still holds its text.
 */
const ROOT_FONT_SIZES: Record<AppFontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "19px",
};

/**
 * The root font size for a setting, so the server can put it on <html>
 * itself rather than leaving the browser to correct it after hydration.
 *
 * Exported as a lookup rather than the table, so a caller cannot reach in
 * with a size the type does not allow.
 */
export function rootFontSizeFor(
  size: AppFontSize,
): string {
  return ROOT_FONT_SIZES[size];
}

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

  const cookie = readPreferenceCookie(
    APP_FONT_SIZE_COOKIE,
  );

  if (isAppFontSize(cookie)) return cookie;

  const saved = window.localStorage.getItem(
    FONT_SIZE_STORAGE_KEY,
  );

  if (!isAppFontSize(saved)) {
    return DEFAULT_APP_FONT_SIZE;
  }

  // A device that chose a size before the cookie existed, migrated on the
  // read so this is the last load laid out at the wrong size.
  writePreferenceCookie(APP_FONT_SIZE_COOKIE, saved);

  return saved;
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

  writePreferenceCookie(APP_FONT_SIZE_COOKIE, size);

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

/*
 * Also a cookie. The goal is rendered as a number — on the settings row, and
 * behind Yumi's cookie tray — so a server that cannot see it renders somebody
 * else's target and the browser corrects it, which is a hydration mismatch and
 * therefore a whole page rebuilt to change two digits.
 */
export const DAILY_GOAL_COOKIE = "exchange-notes-daily-word-goal";

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

  const cookie = readPreferenceCookie(DAILY_GOAL_COOKIE);
  const fromCookie = cookie === null ? null : Number(cookie);

  if (isDailyGoalWords(fromCookie)) return fromCookie;

  const saved = window.localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
  const parsed = saved === null ? null : Number(saved);

  if (!isDailyGoalWords(parsed)) return DEFAULT_DAILY_GOAL_WORDS;

  writePreferenceCookie(DAILY_GOAL_COOKIE, String(parsed));

  return parsed;
}

export function setDailyGoalWords(words: DailyGoalWords) {
  if (typeof window === "undefined") return;

  writePreferenceCookie(DAILY_GOAL_COOKIE, String(words));

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

export function getInterfaceLanguage(): InterfaceLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_INTERFACE_LANGUAGE;
  }

  const cookie = readPreferenceCookie(
    INTERFACE_LANGUAGE_COOKIE,
  );

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
  writePreferenceCookie(
    INTERFACE_LANGUAGE_COOKIE,
    saved,
  );

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
  writePreferenceCookie(
    INTERFACE_LANGUAGE_COOKIE,
    language,
  );

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

export const DEFAULT_INTERFACE_MODE: InterfaceMode = "standard";

export function isInterfaceMode(value: unknown): value is InterfaceMode {
  return value === "standard" || value === "yumi-cosmic";
}

export function getInterfaceMode(): InterfaceMode {
  if (typeof document === "undefined") {
    return DEFAULT_INTERFACE_MODE;
  }

  const saved = readPreferenceCookie(INTERFACE_MODE_COOKIE);

  return isInterfaceMode(saved) ? saved : DEFAULT_INTERFACE_MODE;
}

export function applyInterfaceMode(mode: InterfaceMode) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.interfaceMode = mode;
}

export function setInterfaceMode(mode: InterfaceMode) {
  if (typeof document === "undefined") return;

  writePreferenceCookie(INTERFACE_MODE_COOKIE, mode);

  applyInterfaceMode(mode);

  window.dispatchEvent(
    new CustomEvent<InterfaceMode>(INTERFACE_MODE_EVENT, {
      detail: mode,
    }),
  );
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
