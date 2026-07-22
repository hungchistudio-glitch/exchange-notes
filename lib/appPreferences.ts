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
