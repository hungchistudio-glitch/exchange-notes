"use client";

import { micNoticeFor } from "@/hooks/useVoiceInput";
import { audioSessionType, beginCapture, reassertCapture } from "@/lib/audio/session";
import type { MicPlatform } from "@/lib/i18n/types";
import { getRecognitionConstructor } from "@/lib/speechRecognition";
import { setVoiceDeaf, voiceStage } from "@/lib/voice/signal";

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

/** What the browser said, word for word, and in what audio session. */
export type MicFailure = {
  name: string;
  message: string;
  /** The audio session before the try, and during it ("ambient→play-and-record"). */
  session: string | null;
  /** Whether the second way was tried too. */
  retried: boolean;
};

export type MicTry =
  | { ok: true; stream: MediaStream; release: () => void; retried: boolean }
  | { ok: false; problem: "denied" | "busy" | "missing"; failure: MicFailure };

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Open the microphone from a tap, and say what happened. The record
 * session is asked for first (lib/audio/session.ts); a refusal is asked
 * again once, a quarter of a second later, with the session asked for
 * afresh. The caller owns the stream and calls `release` when it is done
 * with it. A yes takes Yumi's earmuffs off; a refusal puts them on.
 */
export async function openMicrophone(): Promise<MicTry> {
  const before = audioSessionType();
  const sessionNow = () => (before === null ? null : `${before}→${audioSessionType()}`);
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, problem: "missing", failure: { name: "NoMediaDevices", message: "", session: sessionNow(), retried: false } };
  }
  const endCapture = beginCapture();
  let retried = false;
  let failure: unknown;
  for (const attempt of [0, 1]) {
    try {
      // The first ask starts in the tap itself; the second after a pause.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setVoiceDeaf(false);
      return {
        ok: true,
        stream,
        retried,
        release: () => {
          for (const track of stream.getTracks()) track.stop();
          endCapture();
        },
      };
    } catch (error) {
      failure = error;
      if (attempt === 0) {
        retried = true;
        reassertCapture();
        await wait(250);
      }
    }
  }
  // The session as the refusal met it, before it is handed back.
  const session = sessionNow();
  endCapture();
  const notice = micNoticeFor(failure);
  if (notice === "mic-denied") setVoiceDeaf(true);
  return {
    ok: false,
    problem: notice === "mic-busy" ? "busy" : notice === "mic-missing" ? "missing" : "denied",
    failure: {
      name: String((failure as { name?: unknown } | null)?.name ?? "Error"),
      message: String((failure as { message?: unknown } | null)?.message ?? "").slice(0, 160),
      session,
      retried,
    },
  };
}

/** Opened and closed at once: only whether it can be. */
export async function tryMicrophone(): Promise<Exclude<MicTry, { ok: true }> | { ok: true }> {
  const tried = await openMicrophone();
  if (!tried.ok) return tried;
  tried.release();
  return { ok: true };
}

/* =========================================================
   The diagnostic code (Chi, 2026-11-27: 診斷碼＋一鍵回報)

   One line, short enough to read off a screenshot and under the reports'
   500 characters: the browser's own words for the refusal, the audio
   session before and during, what the browser says of the permission, how
   many microphones it can see, and the kind of device. Nothing about the
   account and no full user agent.
   ========================================================= */

function osOf(agent: string) {
  const ios = agent.match(/OS (\d+)_(\d+)/);
  if (/iPhone|iPad|iPod/.test(agent) && ios) return `iOS ${ios[1]}.${ios[2]}`;
  const android = agent.match(/Android (\d+)/);
  if (android) return `Android ${android[1]}`;
  if (/Mac OS X/.test(agent)) return "macOS";
  if (/Windows/.test(agent)) return "Windows";
  return "other";
}

function browserOf(agent: string) {
  if (/CriOS/.test(agent)) return "Chrome-iOS";
  if (/FxiOS|Firefox\//.test(agent)) return "Firefox";
  if (/EdgiOS|Edg\//.test(agent)) return "Edge";
  if (/Chrome\//.test(agent)) return "Chrome";
  if (/Safari\//.test(agent)) return "Safari";
  return "other";
}

export async function micDiagnostic(failure: MicFailure | null, retried = false): Promise<string> {
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent ?? "";
  const inputs = await navigator.mediaDevices?.enumerateDevices?.()
    .then(list => list.filter(device => device.kind === "audioinput").length)
    .catch(() => -1) ?? -1;
  const permission = await micPermission();
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    || (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches);
  const last = voiceStage.lastError;
  const parts = [
    "mic2",
    detectMicPlatform(),
    osOf(agent),
    browserOf(agent),
    failure ? `${failure.name}: ${failure.message || "-"}` : "opened",
    `session ${failure?.session ?? "-"}`,
    `perm ${permission}`,
    `inputs ${inputs}`,
    `standalone ${standalone ? "y" : "n"}`,
    `secure ${typeof isSecureContext === "boolean" ? (isSecureContext ? "y" : "n") : "?"}`,
    `retried ${(failure?.retried ?? retried) ? "y" : "n"}`,
    `recognizer ${getRecognitionConstructor() ? "y" : "n"}`,
    last ? `search ${last.name}: ${last.message || "-"} (${last.session ?? "-"}${last.retried ? ", retried" : ""})` : "search -",
  ];
  return parts.join(" | ").slice(0, 500);
}

/** Whether a refusal is the iPhone's audio rather than a setting (WebKit bug 319706). */
export function audioStuck(failure: MicFailure | null) {
  return Boolean(failure && /AVAudioSession|CaptureDevice/i.test(failure.message));
}

/** Send the code to the app's owner, who reads it on /reports. */
export async function sendMicDiagnostic(code: string): Promise<boolean> {
  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surface: "device", itemKey: "microphone", language: null, quoted: code, note: "", page: window.location.pathname }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
