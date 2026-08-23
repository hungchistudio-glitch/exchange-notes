/* =========================================================
   The recorder, as a state machine

   Separated from the microphone itself so the states can be reasoned about
   and tested without a device. Everything effectful — getUserMedia, the
   MediaRecorder, releasing the stream — lives in hooks/pronunciation/
   useRecorder.ts and does nothing but drive this.

   The states are the ones a learner actually meets, including the ones that
   are not success: a browser that cannot record, a permission that was
   refused, a permission that was refused permanently. Each is a different
   thing to say to them, so each is a different state rather than one
   "error".
   ========================================================= */

export type RecorderStatus =
  | "unsupported"
  | "idle"
  | "requesting"
  | "denied"
  | "recording"
  | "recorded"
  | "failed";

export type RecorderState = {
  status: RecorderStatus;
  /** Object URL for the last recording. Revoked when it is replaced. */
  clipUrl: string | null;
  /** Milliseconds of the last recording, for the compare view. */
  durationMs: number;
  /** Present only in `failed`; `denied` is its own status. */
  error: "no-audio" | "recorder-failed" | null;
};

export const INITIAL_RECORDER_STATE: RecorderState = {
  status: "idle",
  clipUrl: null,
  durationMs: 0,
  error: null,
};

export type RecorderAction =
  | { type: "unsupported" }
  | { type: "request" }
  | { type: "denied" }
  | { type: "started" }
  | { type: "captured"; clipUrl: string; durationMs: number }
  | { type: "failed"; error: NonNullable<RecorderState["error"]> }
  | { type: "discard" };

/**
 * Pure, and deliberately so — including the object-URL bookkeeping.
 *
 * The reducer does not revoke anything: it only ever *replaces* the URL it
 * is holding, and the caller revokes what it gets back. A reducer that
 * revoked would be a reducer with a side effect, and React may call it more
 * than once for the same action.
 */
export function recorderReducer(
  state: RecorderState,
  action: RecorderAction,
): RecorderState {
  switch (action.type) {
    case "unsupported":
      return { ...state, status: "unsupported", error: null };

    case "request":
      // A refusal is remembered until the user asks again, so this clears it.
      return { ...state, status: "requesting", error: null };

    case "denied":
      return { ...state, status: "denied", error: null };

    case "started":
      return { ...state, status: "recording", error: null };

    case "captured":
      return {
        status: "recorded",
        clipUrl: action.clipUrl,
        durationMs: action.durationMs,
        error: null,
      };

    case "failed":
      return { ...state, status: "failed", error: action.error };

    case "discard":
      /*
       * Keeps `unsupported`, which is a fact about the device rather than a
       * step in the flow — throwing a clip away cannot make a recorder
       * exist. Without this, moving to the next word in a session (which
       * discards the previous recording) put a browser with no MediaRecorder
       * back into "idle" and offered it a record button that could never
       * work.
       */
      return state.status === "unsupported"
        ? state
        : { ...INITIAL_RECORDER_STATE, status: "idle" };
  }
}

/** Whether a status means the microphone is live right now. */
export function isCapturing(status: RecorderStatus): boolean {
  return status === "requesting" || status === "recording";
}

/** Whether the user can start a recording from this status. */
export function canRecord(status: RecorderStatus): boolean {
  return status === "idle" || status === "recorded" || status === "failed";
}

/**
 * The MIME type to record in.
 *
 * Safari records audio/mp4 and Chrome records audio/webm, and neither
 * accepts the other's string. Asking the browser rather than assuming is
 * what keeps this from throwing on one of them.
 */
export function preferredRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function recordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/** The longest a single attempt may run before it is stopped for you. */
export const MAX_RECORDING_MS = 10_000;
