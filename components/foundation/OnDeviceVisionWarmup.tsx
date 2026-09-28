"use client";

import { useEffect } from "react";

import { preloadObjectClassifier } from "@/lib/vision/onDeviceClassifier";

/*
 * Fetches the camera's on-device classifier in the background after sign-in.
 *
 * Chi's choice (2026-09-28): download it ahead rather than on the first
 * photograph, so that the first photo taken at a Gemini peak is already
 * answered on the phone. About 7.5MB the first time on a device — the
 * runtime from this site, the model from Google's bucket into Cache Storage —
 * and nothing after that.
 *
 * Late and idle on purpose: a signed-in screen's own requests go first, and
 * Yumi's scene is built before this competes with it for the main thread.
 * A reader who has asked the browser to save data is left alone; the camera
 * then loads it on first use instead.
 */
const START_AFTER_MS = 6_000;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function OnDeviceVisionWarmup() {
  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;
    if (connection?.saveData) return;

    const idleWindow = window as IdleWindow;
    let idleHandle: number | null = null;

    const timer = window.setTimeout(() => {
      const start = () => void preloadObjectClassifier();

      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(start, { timeout: 10_000 });
      } else {
        start();
      }
    }, START_AFTER_MS);

    return () => {
      window.clearTimeout(timer);
      if (idleHandle !== null) idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }, []);

  return null;
}
