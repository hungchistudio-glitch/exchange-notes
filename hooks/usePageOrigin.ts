"use client";

import { useSyncExternalStore } from "react";

/*
 * The origin never changes while the page is open, so there is nothing to
 * subscribe to — what matters is that the server snapshot is the empty string.
 * Callers use that to hold back rendering anything origin-dependent (the
 * friend QR code) until the browser has one, rather than baking a build-time
 * host into markup that a Vercel Preview would then serve under a different
 * domain.
 */
const subscribeNever = () => () => undefined;
const readOrigin = () => window.location.origin;
const noOrigin = () => "";

export default function usePageOrigin(): string {
  return useSyncExternalStore(subscribeNever, readOrigin, noOrigin);
}
