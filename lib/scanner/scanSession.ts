"use client";

import { useCallback, useMemo, useReducer } from "react";

import type {
  MenuAnalyzeResponse,
  MenuDocument,
  MenuScanProgress,
} from "@/lib/scanner/menuTypes";

/*
 * One canonical state for a menu scan.
 *
 * Every screen in this flow reads from here rather than keeping its own idea
 * of how far along things are — the camera, the processing core, the viewer
 * and the error states are all views of this single value. A component that
 * infers "we must be translating by now" from a spinner it started itself is
 * how a pipeline ends up showing two different answers at once.
 */

export type ScanState =
  | "idle"
  | "camera_ready"
  | "menu_detected"
  | "capturing"
  | "preprocessing"
  | "ocr_processing"
  | "translation_ready"
  | "partial"
  | "failed"
  | "cancelled";

export type ScanFailure =
  | "not_a_menu"
  | "no_items_found"
  | "rate_limit"
  | "daily_limit"
  | "timeout"
  | "offline"
  | "unavailable"
  | "camera"
  | "unknown";

export type ScanSession = {
  state: ScanState;
  progress: MenuScanProgress;
  // The captured frame, as a data URL. Held in memory for the life of the
  // scan and never uploaded anywhere but the analyser.
  image: string | null;
  document: MenuDocument | null;
  failure: ScanFailure | null;
  errorMessage: string;
  // Set when the photo looked poor and the user has not yet decided whether
  // to retake it. Never blocks on its own.
  qualityWarning: "dark" | "glare" | "blur" | null;
};

export type ScanAction =
  | { type: "camera_ready" }
  | { type: "detection"; detected: boolean }
  | { type: "captured"; image: string; quality: "dark" | "glare" | "blur" | null }
  | { type: "dismiss_quality" }
  | { type: "analyze_started" }
  | { type: "analyzed"; response: MenuAnalyzeResponse }
  | { type: "failed"; failure: ScanFailure; message: string }
  | { type: "cancel" }
  | { type: "reset" };

const IDLE_PROGRESS: MenuScanProgress = {
  ocr: "pending",
  translation: "pending",
  reconstruction: "pending",
};

export const INITIAL_SESSION: ScanSession = {
  state: "idle",
  progress: IDLE_PROGRESS,
  image: null,
  document: null,
  failure: null,
  errorMessage: "",
  qualityWarning: null,
};

export function scanSessionReducer(
  session: ScanSession,
  action: ScanAction,
): ScanSession {
  switch (action.type) {
    case "camera_ready":
      return { ...INITIAL_SESSION, state: "camera_ready" };

    case "detection":
      // Only ever moves between these two: a detector is not allowed to
      // interrupt a capture that is already under way.
      if (session.state !== "camera_ready" && session.state !== "menu_detected") {
        return session;
      }

      return {
        ...session,
        state: action.detected ? "menu_detected" : "camera_ready",
      };

    case "captured":
      return {
        ...session,
        state: action.quality ? "capturing" : "preprocessing",
        image: action.image,
        qualityWarning: action.quality,
      };

    case "dismiss_quality":
      return { ...session, state: "preprocessing", qualityWarning: null };

    case "analyze_started":
      return {
        ...session,
        state: "ocr_processing",
        progress: { ...IDLE_PROGRESS, ocr: "processing" },
        failure: null,
        errorMessage: "",
      };

    case "analyzed": {
      const { response } = action;

      if (!response.document) {
        return {
          ...session,
          state: "failed",
          progress: response.progress,
          failure: response.notMenu ? "not_a_menu" : "no_items_found",
          errorMessage: "",
        };
      }

      return {
        ...session,
        state: response.state === "partial" ? "partial" : "translation_ready",
        progress: response.progress,
        document: response.document,
        failure: null,
        errorMessage: "",
      };
    }

    case "failed":
      return {
        ...session,
        state: "failed",
        progress: { ...session.progress, ocr: "failed" },
        failure: action.failure,
        errorMessage: action.message,
      };

    case "cancel":
      return { ...INITIAL_SESSION, state: "cancelled" };

    case "reset":
      return INITIAL_SESSION;

    default:
      return session;
  }
}

export function useScanSession() {
  const [session, dispatch] = useReducer(scanSessionReducer, INITIAL_SESSION);

  const isBusy =
    session.state === "preprocessing" || session.state === "ocr_processing";

  const hasResult =
    session.state === "translation_ready" || session.state === "partial";

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return useMemo(
    () => ({ session, dispatch, isBusy, hasResult, reset }),
    [session, isBusy, hasResult, reset],
  );
}
