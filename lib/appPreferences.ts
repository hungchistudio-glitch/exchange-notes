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
