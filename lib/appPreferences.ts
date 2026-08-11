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
   Daily study goal (minutes)
   ========================================================= */

export type DailyGoalMinutes = 5 | 10 | 15 | 20 | 30;

const DAILY_GOAL_STORAGE_KEY = "exchange-notes-daily-goal";
const DAILY_GOAL_EVENT = "exchange-notes-daily-goal-change";

export const DEFAULT_DAILY_GOAL_MINUTES: DailyGoalMinutes = 10;

export function isDailyGoalMinutes(
  value: unknown,
): value is DailyGoalMinutes {
  return (
    value === 5 || value === 10 || value === 15 || value === 20 || value === 30
  );
}

export function getDailyGoalMinutes(): DailyGoalMinutes {
  if (typeof window === "undefined") {
    return DEFAULT_DAILY_GOAL_MINUTES;
  }

  const saved = window.localStorage.getItem(DAILY_GOAL_STORAGE_KEY);
  const parsed = saved === null ? null : Number(saved);

  return isDailyGoalMinutes(parsed) ? parsed : DEFAULT_DAILY_GOAL_MINUTES;
}

export function setDailyGoalMinutes(minutes: DailyGoalMinutes) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(DAILY_GOAL_STORAGE_KEY, String(minutes));

  window.dispatchEvent(
    new CustomEvent<DailyGoalMinutes>(DAILY_GOAL_EVENT, {
      detail: minutes,
    }),
  );
}

export function subscribeToDailyGoalMinutes(
  listener: (minutes: DailyGoalMinutes) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleChange(event: Event) {
    const customEvent = event as CustomEvent<DailyGoalMinutes>;

    if (isDailyGoalMinutes(customEvent.detail)) {
      listener(customEvent.detail);
    }
  }

  function handleStorage(event: StorageEvent) {
    const parsed = event.newValue === null ? null : Number(event.newValue);

    if (event.key === DAILY_GOAL_STORAGE_KEY && isDailyGoalMinutes(parsed)) {
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

export type InterfaceLanguage = "english" | "traditional-chinese";

const INTERFACE_LANGUAGE_STORAGE_KEY =
  "exchange-notes-interface-language";

const INTERFACE_LANGUAGE_EVENT =
  "exchange-notes-interface-language-change";

export const DEFAULT_INTERFACE_LANGUAGE: InterfaceLanguage = "english";

export function isInterfaceLanguage(
  value: unknown,
): value is InterfaceLanguage {
  return (
    value === "english" ||
    value === "traditional-chinese"
  );
}

export function getInterfaceLanguage(): InterfaceLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_INTERFACE_LANGUAGE;
  }

  const saved = window.localStorage.getItem(
    INTERFACE_LANGUAGE_STORAGE_KEY,
  );

  return isInterfaceLanguage(saved)
    ? saved
    : DEFAULT_INTERFACE_LANGUAGE;
}

export function applyInterfaceLanguage(
  language: InterfaceLanguage,
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.dataset.interfaceLanguage = language;
  root.lang =
    language === "traditional-chinese"
      ? "zh-Hant"
      : "en";
}

export function setInterfaceLanguage(
  language: InterfaceLanguage,
) {
  if (typeof window === "undefined") return;

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
 * Alone among the preferences here, this one lives in a cookie rather than
 * localStorage.
 *
 * Every other preference only ever changes how something already on screen is
 * painted, so correcting it after hydration is invisible. Interface mode picks
 * between two different component trees — the standard home and the Command
 * Deck — which the server has to render correctly the first time. localStorage
 * does not exist during a server render; a cookie does, so the mode is already
 * decided in the HTML that arrives, and there is no mismatch to reconcile and
 * no standard-then-cosmic flash to sit through.
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
