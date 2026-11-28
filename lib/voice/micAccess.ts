"use client";

import { micNoticeFor } from "@/hooks/useVoiceInput";
import type { MicPlatform } from "@/lib/i18n/types";
import { setVoiceDeaf } from "@/lib/voice/signal";

/* =========================================================
   Where the microphone is switched on (Chi, 2026-11-27)

   "Microphone access is off. Turn it on in your settings" left a reader on
   a Home Screen app with nowhere to look: the switch is not in this app,
   and it is in a different place on every kind of device. This works out
   which kind this is, so the guide (components/voice/MicGuide.tsx) can
   show that one's steps first. Loaded only with the guide and Settings.
   ========================================================= */

type NavigatorLike = {
  userAgent?: string;
  vendor?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
};

/** Which steps to show first. Every kind can still be chosen by hand. */
export function detectMicPlatform(
  scope: { navigator?: NavigatorLike; matchMedia?: (query: string) => { matches: boolean }; __yumiPocketKey?: unknown } =
    typeof window === "undefined" ? {} : (window as never),
): MicPlatform {
  const nav = scope.navigator ?? {};
  const agent = nav.userAgent ?? "";
  // iPadOS asks for a desktop page and says it is a Mac; its touch screen gives it away.
  const ios = /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && (nav.maxTouchPoints ?? 0) > 1);
  if (ios) {
    // The iPhone app tells its pages it is there (ExchangeNotesWebView.swift).
    if (scope.__yumiPocketKey !== undefined) return "ios-app";
    const standalone = nav.standalone === true || Boolean(scope.matchMedia?.("(display-mode: standalone)").matches);
    return standalone ? "ios-home" : "ios-safari";
  }
  if (/Android/i.test(agent)) return "android";
  if (/Firefox\//.test(agent)) return "desktop-firefox";
  if (nav.vendor === "Apple Computer, Inc." && /Macintosh/.test(agent)) return "mac-safari";
  return "desktop-chrome";
}

export type MicPermission = "granted" | "denied" | "prompt" | "unknown";

/** What the browser says without asking; "unknown" where it will not say. */
export async function micPermission(): Promise<MicPermission> {
  try {
    const status = await navigator.permissions?.query({ name: "microphone" as PermissionName });
    if (status?.state === "granted" || status?.state === "denied" || status?.state === "prompt") return status.state;
  } catch { /* Safari before 16 and Firefox do not know this name. */ }
  return "unknown";
}

export type MicTry =
  | { ok: true; stream: MediaStream }
  | { ok: false; problem: "denied" | "busy" | "missing" };

/**
 * Open the microphone once, from a tap, and say what happened. The caller
 * owns the stream and stops it. A yes also takes Yumi's earmuffs off; a
 * no puts them on.
 */
export async function openMicrophone(): Promise<MicTry> {
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, problem: "missing" };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setVoiceDeaf(false);
    return { ok: true, stream };
  } catch (error) {
    const notice = micNoticeFor(error);
    if (notice === "mic-denied") setVoiceDeaf(true);
    return { ok: false, problem: notice === "mic-busy" ? "busy" : notice === "mic-missing" ? "missing" : "denied" };
  }
}

/** Opened and closed at once: only whether it can be. */
export async function tryMicrophone(): Promise<Exclude<MicTry, { ok: true }> | { ok: true }> {
  const tried = await openMicrophone();
  if (!tried.ok) return tried;
  for (const track of tried.stream.getTracks()) track.stop();
  return { ok: true };
}
