"use client";

import { useEffect } from "react";

import { isOnline, isWeakSignal } from "@/hooks/useOnline";
import { downloadObjectClassifier } from "@/lib/vision/onDeviceClassifier";

/*
 * Downloads the camera's on-device classifier in the background after
 * sign-in, and keeps it.
 *
 * Chi's choice (2026-09-28): download it ahead rather than on the first
 * photograph, so that the first photo taken at a Gemini peak is already
 * answered on the phone. About 8.7MB the first time on a device — the
 * runtime from this site, the model from Google's bucket, both into Cache
 * Storage — and nothing after that.
 *
 * Downloaded only, not built (Chi, 2026-11-10: "存手機，開相機才啟動"). Until
 * then this compiled the whole runtime on every visit, six seconds in; now
 * TargetCamera builds it when the camera opens, and a visit that has the
 * files already costs two cache lookups.
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
      /*
       * Not on a weak signal or none: 8.7MB would be competing with the
       * reader's own requests, or failing. A later visit tries again.
       */
      const start = () => {
        if (isOnline() && !isWeakSignal()) void downloadObjectClassifier();
      };

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
