"use client";

import { useSyncExternalStore } from "react";

/* =========================================================
   Whether there is a network

   navigator.onLine is famously weak — it reports whether the device has a
   network interface, not whether anything is reachable through it, so a
   hotel wifi that has stopped forwarding still reads as online. It is
   still the right *first* signal: it flips instantly, costs nothing, and
   is correct about the case that matters most, which is airplane mode and
   no signal.

   What it cannot see is corrected by the code that actually makes
   requests: a failed fetch marks the app offline until the browser says
   otherwise, so one dead request is enough and the reader never has to be
   told twice.
   ========================================================= */

let assumedOffline = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Called by anything that tried to reach the network and could not.
 *
 * This is the half navigator.onLine cannot supply. A request that fails
 * with a network error — as opposed to a 4xx or 5xx, which prove the
 * network is fine — is the strongest evidence available that there is
 * nothing out there.
 */
export function reportNetworkFailure() {
  if (assumedOffline) return;
  assumedOffline = true;
  notify();
}

/** Called by anything that reached the network successfully. */
export function reportNetworkSuccess() {
  if (!assumedOffline) return;
  assumedOffline = false;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onOnline = () => {
    // The browser saying the interface is back is a reason to try again,
    // not proof that anything is reachable — so the assumption is dropped
    // and the next real request gets to decide.
    assumedOffline = false;
    notify();
  };

  const onOffline = () => notify();

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

function getSnapshot(): boolean {
  if (assumedOffline) return false;
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/*
 * Online on the server, always.
 *
 * The alternative is rendering every screen's offline state into the HTML
 * and correcting it on hydration, which shows a connected reader an
 * "offline" flash on every cold load.
 */
const getServerSnapshot = () => true;

export default function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** The same answer outside React, for code that is not a component. */
export function isOnline(): boolean {
  return getSnapshot();
}
