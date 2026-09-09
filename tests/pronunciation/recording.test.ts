import { describe, expect, it } from "vitest";

import {
  INITIAL_RECORDER_STATE,
  canRecord,
  isCapturing,
  recorderReducer,
} from "@/lib/pronunciation/lab/recording";

describe("recorderReducer", () => {
  it("walks the ordinary path", () => {
    let state = INITIAL_RECORDER_STATE;

    state = recorderReducer(state, { type: "request" });
    expect(state.status).toBe("requesting");

    state = recorderReducer(state, { type: "started" });
    expect(state.status).toBe("recording");

    state = recorderReducer(state, {
      type: "captured",
      clipUrl: "blob:one",
      durationMs: 1200,
    });

    expect(state).toMatchObject({
      status: "recorded",
      clipUrl: "blob:one",
      durationMs: 1200,
    });
  });

  it("keeps a refusal separate from a failure", () => {
    // They need different words: one is "allow the microphone in your
    // browser", the other is "try again".
    const denied = recorderReducer(INITIAL_RECORDER_STATE, { type: "denied" });
    const failed = recorderReducer(INITIAL_RECORDER_STATE, {
      type: "failed",
      error: "no-audio",
    });

    expect(denied.status).toBe("denied");
    expect(denied.error).toBeNull();
    expect(failed.status).toBe("failed");
    expect(failed.error).toBe("no-audio");
  });

  it("clears a previous refusal when the user asks again", () => {
    let state = recorderReducer(INITIAL_RECORDER_STATE, { type: "denied" });
    state = recorderReducer(state, { type: "request" });

    expect(state.status).toBe("requesting");
    expect(state.error).toBeNull();
  });

  it("replaces the clip rather than revoking it", () => {
    // Revoking is a side effect and this is a reducer React may call twice
    // for the same action. The caller revokes what it gets back.
    let state = recorderReducer(INITIAL_RECORDER_STATE, {
      type: "captured",
      clipUrl: "blob:one",
      durationMs: 1000,
    });

    state = recorderReducer(state, {
      type: "captured",
      clipUrl: "blob:two",
      durationMs: 900,
    });

    expect(state.clipUrl).toBe("blob:two");
  });

  it("discards back to a clean idle", () => {
    let state = recorderReducer(INITIAL_RECORDER_STATE, {
      type: "captured",
      clipUrl: "blob:one",
      durationMs: 1000,
    });

    state = recorderReducer(state, { type: "discard" });

    expect(state).toEqual({ ...INITIAL_RECORDER_STATE, status: "idle" });
  });

  it("cannot discard a device that has no recorder into having one", () => {
    // Regression: moving to the next word in a session discards the previous
    // clip, and that used to put a browser with no MediaRecorder back into
    // "idle" — offering a record button that could never work.
    const unsupported = recorderReducer(INITIAL_RECORDER_STATE, {
      type: "unsupported",
    });

    expect(recorderReducer(unsupported, { type: "discard" }).status).toBe(
      "unsupported",
    );
  });
});

describe("recorder status predicates", () => {
  it("knows when the microphone is live", () => {
    expect(isCapturing("requesting")).toBe(true);
    expect(isCapturing("recording")).toBe(true);
    expect(isCapturing("recorded")).toBe(false);
    expect(isCapturing("denied")).toBe(false);
  });

  it("lets the user try again after a failure but not while unsupported", () => {
    expect(canRecord("idle")).toBe(true);
    expect(canRecord("recorded")).toBe(true);
    expect(canRecord("failed")).toBe(true);
    expect(canRecord("unsupported")).toBe(false);
    expect(canRecord("recording")).toBe(false);
  });
});
