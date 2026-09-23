"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { getRememberedInstalled, markAppInstalled } from "@/lib/pwaPreferences";

export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/* =========================================================
   The install offer belongs to the document, not to a component

   `beforeinstallprompt` fires once per document, and the event it hands over
   is the only way to open the browser's install dialog — there is no way to
   ask for another one. This hook used to keep that event in component state,
   which meant whichever screen happened to be mounted when Chrome decided the
   app was installable captured it, and every other screen believed the app
   could not be installed.

   That is not a hypothetical. Settings mounts this hook for its Devices row,
   Devices & Widgets mounts it for the install row, and the install sheet
   mounts it again. Walking Settings → Devices unmounted the holder and took
   the event with it: the row that exists to install the app said the browser
   would not allow it, for the rest of the session, on a browser that would.

   So the event lives here, above every component, and each hook reads it.
   Same shape as the phonetics store, and for the same reason: the fact does
   not depend on who is asking.
   ========================================================= */

type InstallState = {
  /** The browser's deferred offer, or null once it is spent or absent. */
  prompt: BeforeInstallPromptEvent | null;
  /** Set by `appinstalled`, which every mounted view should hear at once. */
  installed: boolean;
};

const EMPTY_INSTALL_STATE: InstallState = { prompt: null, installed: false };

let installState: InstallState = EMPTY_INSTALL_STATE;
let listening = false;
const listeners = new Set<() => void>();

function publish(next: InstallState) {
  installState = next;
  for (const listener of listeners) listener();
}

/*
 * `installed` is never cleared by a later event.
 *
 * Writing the whole state on every publish is how it got lost: an
 * `appinstalled` followed by any `beforeinstallprompt` — which Chrome does
 * fire again after an uninstall, and which some browsers fire spuriously —
 * put `installed: false` back and the app forgot it had been installed.
 * Every publisher below changes one field and leaves the other alone.
 */
function rememberInstalled() {
  try {
    markAppInstalled();
  } catch {
    // Storage can be unavailable in a private window or with site data
    // blocked. The installed state still holds for this tab either way.
  }

  publish({ prompt: null, installed: true });
}

function handleBeforeInstallPrompt(event: Event) {
  // Chrome/Android would otherwise show its own mini-infobar immediately —
  // suppressing that lets our own card decide when to offer installing.
  event.preventDefault();
  publish({ ...installState, prompt: event as BeforeInstallPromptEvent });
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  /*
   * Attached once and never removed. The last component to unmount is not
   * evidence that the document has stopped being installable, and an event
   * that arrives while nothing is mounted is an offer the next screen should
   * still have.
   */
  if (!listening && typeof window !== "undefined") {
    listening = true;
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", rememberInstalled);
  }

  return () => {
    listeners.delete(listener);
  };
}

const getInstallState = () => installState;
const getServerInstallState = () => EMPTY_INSTALL_STATE;

function detectPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;

  // iOS Safari never implemented the display-mode media query for this;
  // it exposes navigator.standalone instead — not in TS's lib.dom types.
  const nav = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

export default function usePwaInstall() {
  const [platform, setPlatform] = useState<PwaPlatform>("unknown");
  const [detectedStandalone, setDetectedStandalone] = useState(false);

  const shared = useSyncExternalStore(
    subscribe,
    getInstallState,
    getServerInstallState,
  );

  useEffect(() => {
    // Deferred a tick: platform/standalone detection only makes sense
    // post-mount (server has no navigator/window at all), but setting
    // state synchronously at the top of an effect body still trips the
    // "avoid cascading renders" lint rule — queueMicrotask satisfies both
    // constraints without changing the effective timing (still resolves
    // before the next paint).
    queueMicrotask(() => {
      setPlatform(detectPlatform());

      try {
        setDetectedStandalone(detectStandalone() || getRememberedInstalled());
      } catch {
        // Reading the remembered flag can throw where site data is blocked.
        // The display-mode answer is still worth having.
        setDetectedStandalone(detectStandalone());
      }
    });
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    // Read through the store rather than the subscribed snapshot: two
    // controls can be mounted, and the one that was rendered a moment ago
    // must not act on an offer the other has already spent.
    const offer = installState.prompt;
    if (!offer) return "unavailable";

    // Claimed before awaiting, so a second control cannot prompt the same
    // event while this one is open.
    publish({ ...installState, prompt: null });

    let choice: { outcome: "accepted" | "dismissed" };

    try {
      await offer.prompt();
      choice = await offer.userChoice;
    } catch (error) {
      /*
       * The dialog never opened — a gesture the browser did not accept, a
       * tab going to the background. The offer was not spent, so it goes
       * back; discarding it here is what would leave the reader with an
       * install row that can never be pressed again.
       */
      publish({ ...installState, prompt: offer });
      console.error("The install prompt could not be opened.", error);
      return "unavailable";
    }

    if (choice.outcome === "accepted") rememberInstalled();

    return choice.outcome;
  }, []);

  return {
    platform,
    isStandalone: detectedStandalone || shared.installed,
    // Android/Chrome only fires beforeinstallprompt once its own
    // installability heuristics pass (manifest, service worker, HTTPS,
    // engagement) — this reflects that, not just "we're on Android".
    canPromptInstall: shared.prompt !== null,
    promptInstall,
  };
}
