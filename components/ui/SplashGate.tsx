"use client";

import { useSyncExternalStore } from "react";

import AppSplash from "./AppSplash";

const SESSION_KEY = "exchange-notes:splash-seen-v2";

/**
 * Whether the splash has already played this session is sessionStorage
 * state, not component state, so it is modelled as a real external store.
 *
 * The alternative — reading it in a useState initialiser — would render
 * differently on the server than on the client and break hydration, which is
 * why the previous version corrected itself inside a layout effect instead.
 * Subscribing removes that effect without reintroducing the mismatch: the
 * server snapshot always reports "not seen", so the markup React hydrates
 * against is the markup the server sent.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function hasSeenSplash() {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    // Some private modes disable sessionStorage; showing the splash again is
    // the harmless outcome.
    return false;
  }
}

function hasSeenSplashOnServer() {
  return false;
}

function markSplashSeen() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // The splash still has to close even if the flag cannot be stored.
  }

  for (const listener of listeners) listener();
}

export default function SplashGate() {
  const seen = useSyncExternalStore(
    subscribe,
    hasSeenSplash,
    hasSeenSplashOnServer,
  );

  if (seen) return null;

  return <AppSplash onComplete={markSplashSeen} />;
}
