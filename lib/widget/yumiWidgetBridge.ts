import { queueScriptableYumiWidgetSnapshotSync } from "@/lib/scriptable/widgetSnapshotClient";

export type YumiWidgetLanguage =
  | "english"
  | "traditional-chinese";

export type YumiWidgetLocalizedText = {
  headline: string;
  hint: string;
  emptyWord: string;
  cookieUnit: string;
};

export type YumiWidgetWord = {
  id: string;
  englishWord: string;
  traditionalChineseWord: string;
  pinyin: string;
  zhuyin: string;
};

export type YumiWidgetUpdatePayload = {
  cookieCount: number;
  cookieGoal: number;

  englishWord: string;
  traditionalChineseWord: string;
  pinyin: string;
  zhuyin: string;
  words: YumiWidgetWord[];

  interfaceLanguage: YumiWidgetLanguage;
  learningLanguage: YumiWidgetLanguage;
  moodKey: string;

  localizedText: YumiWidgetLocalizedText;
};

type NativeYumiWidgetHandler = {
  postMessage: (
    body: YumiWidgetUpdatePayload,
  ) => void;
};

type WindowWithYumiWidgetBridge = Window & {
  webkit?: {
    messageHandlers?: {
      yumiWidgetUpdate?: NativeYumiWidgetHandler;
    };
  };

  __exchangeNotesYumiWidgetPayload?: YumiWidgetUpdatePayload;
  __exchangeNotesFlushYumiWidget?: () => boolean;
};

const NATIVE_READY_EVENT =
  "exchange-notes-native-ready";

const RETRY_DELAY_MS = 500;
const MAX_RETRY_ATTEMPTS = 20;

let latestPayload: YumiWidgetUpdatePayload | null = null;
let retryTimer: number | null = null;
let retryAttempts = 0;
let listenerInstalled = false;

function bridgeWindow(): WindowWithYumiWidgetBridge | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window as WindowWithYumiWidgetBridge;
}

function nativeHandler(): NativeYumiWidgetHandler | null {
  return (
    bridgeWindow()
      ?.webkit
      ?.messageHandlers
      ?.yumiWidgetUpdate
    ?? null
  );
}

function deliver(
  payload: YumiWidgetUpdatePayload,
): boolean {
  const handler = nativeHandler();

  if (!handler) {
    return false;
  }

  handler.postMessage(payload);

  return true;
}

function scheduleRetry() {
  if (
    typeof window === "undefined"
    || !latestPayload
    || retryTimer
    || retryAttempts >= MAX_RETRY_ATTEMPTS
  ) {
    return;
  }

  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    retryAttempts += 1;

    if (!latestPayload || deliver(latestPayload)) {
      retryAttempts = 0;
      return;
    }

    scheduleRetry();
  }, RETRY_DELAY_MS);
}

function flushLatestPayload(): boolean {
  if (!latestPayload) {
    return false;
  }

  const delivered = deliver(latestPayload);

  if (!delivered) {
    scheduleRetry();
  }

  return delivered;
}

function handleNativeReady() {
  retryAttempts = 0;
  flushLatestPayload();
}

function installNativeReadyListener() {
  const target = bridgeWindow();

  if (!target || listenerInstalled) {
    return;
  }

  target.addEventListener(
    NATIVE_READY_EVENT,
    handleNativeReady,
  );

  target.__exchangeNotesFlushYumiWidget =
    flushLatestPayload;

  listenerInstalled = true;
}

export function postYumiWidgetUpdate(
  payload: YumiWidgetUpdatePayload,
): boolean {
  const target = bridgeWindow();

  if (!target) {
    return false;
  }

  latestPayload = payload;
  target.__exchangeNotesYumiWidgetPayload = payload;

  /*
   * Best-effort web synchronization for the Scriptable Widget.
   * This is intentionally independent from native delivery and must not
   * change this function's existing boolean return value.
   */
  queueScriptableYumiWidgetSnapshotSync(
    payload,
  );

  installNativeReadyListener();

  const delivered = flushLatestPayload();

  if (!delivered) {
    scheduleRetry();
  }

  return delivered;
}
