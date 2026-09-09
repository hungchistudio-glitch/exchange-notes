import { beforeEach, describe, expect, it } from "vitest";

import {
  clearSession,
  currentItem,
  isComplete,
  loadSession,
  parseStoredSession,
  saveSession,
  sessionReducer,
  startSession,
  summariseSession,
} from "@/lib/pronunciation/lab/session";
import type { TrainingItem } from "@/lib/pronunciation/lab/types";

const items: TrainingItem[] = [
  {
    id: "sound:rr",
    kind: "sound",
    targetId: "rr",
    module: "sounds",
    label: "rr",
    estimatedSeconds: 60,
  },
  {
    id: "pair:r-rr",
    kind: "minimal-pair",
    targetId: "r-rr",
    module: "listen",
    label: "r / rr",
    estimatedSeconds: 60,
  },
  {
    id: "speak:rr",
    kind: "speak",
    targetId: "rr",
    module: "speak",
    label: "rr",
    estimatedSeconds: 60,
  },
];

describe("sessionReducer", () => {
  it("advances on an answer and records it", () => {
    const session = startSession("es", items);
    const next = sessionReducer(session, { type: "answer", outcome: "correct" });

    expect(next.index).toBe(1);
    expect(next.results).toHaveLength(1);
    expect(next.results[0]).toMatchObject({ itemId: "sound:rr", attempts: 1 });
    expect(currentItem(next)?.id).toBe("pair:r-rr");
  });

  it("keeps a skip as its own outcome rather than as a wrong answer", () => {
    const session = sessionReducer(startSession("es", items), { type: "skip" });

    expect(session.results[0].outcome).toBe("skipped");
    expect(summariseSession(session).incorrect).toBe(0);
    expect(summariseSession(session).answered).toBe(0);
  });

  it("does not count a retry as an attempt until something is answered", () => {
    let session = startSession("es", items);

    session = sessionReducer(session, { type: "retry" });
    session = sessionReducer(session, { type: "retry" });

    // Tapping retry three times before speaking must not read as three
    // failures.
    expect(session.results).toHaveLength(0);
    expect(session.index).toBe(0);
  });

  it("counts a re-answer as a second attempt and keeps the newer outcome", () => {
    let session = startSession("es", items);
    session = sessionReducer(session, { type: "answer", outcome: "incorrect", score: 30 });
    session = sessionReducer(session, { type: "back" });
    session = sessionReducer(session, { type: "answer", outcome: "correct", score: 90 });

    expect(session.results).toHaveLength(1);
    expect(session.results[0]).toMatchObject({
      outcome: "correct",
      score: 90,
      attempts: 2,
    });
  });

  it("keeps an existing score when a retry measured nothing", () => {
    let session = startSession("es", items);
    session = sessionReducer(session, { type: "answer", outcome: "correct", score: 88 });
    session = sessionReducer(session, { type: "back" });
    session = sessionReducer(session, { type: "answer", outcome: "almost" });

    expect(session.results[0].score).toBe(88);
  });

  it("cannot go back past the beginning", () => {
    const session = sessionReducer(startSession("es", items), { type: "back" });
    expect(session.index).toBe(0);
  });

  it("is complete once the last item is answered", () => {
    let session = startSession("es", items);

    for (let i = 0; i < items.length; i += 1) {
      expect(isComplete(session)).toBe(false);
      session = sessionReducer(session, { type: "answer", outcome: "correct" });
    }

    expect(isComplete(session)).toBe(true);
    expect(currentItem(session)).toBeUndefined();
  });
});

describe("summariseSession", () => {
  it("reports no average when nothing in the session was measured", () => {
    let session = startSession("es", items);
    session = sessionReducer(session, { type: "answer", outcome: "correct" });
    session = sessionReducer(session, { type: "answer", outcome: "almost" });

    expect(summariseSession(session).averageScore).toBeNull();
  });

  it("averages only the items that carried a score", () => {
    let session = startSession("es", items);
    session = sessionReducer(session, { type: "answer", outcome: "correct", score: 100 });
    session = sessionReducer(session, { type: "answer", outcome: "almost" });
    session = sessionReducer(session, { type: "answer", outcome: "correct", score: 80 });

    // An unmeasured item is not a zero to average in.
    expect(summariseSession(session).averageScore).toBe(90);
  });
});

describe("session storage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("round-trips a session", () => {
    const session = sessionReducer(startSession("es", items), {
      type: "answer",
      outcome: "correct",
    });

    saveSession(session);

    expect(loadSession("es")).toMatchObject({ id: session.id, index: 1 });
  });

  it("refuses a session belonging to another language", () => {
    saveSession(startSession("es", items));

    // Switching what you are learning mid-session and being handed Spanish
    // items on a French screen is exactly the leakage this prevents.
    expect(loadSession("fr")).toBeNull();
  });

  it("refuses a finished session", () => {
    saveSession(sessionReducer(startSession("es", items), { type: "complete" }));
    expect(loadSession("es")).toBeNull();
  });

  it("clears", () => {
    saveSession(startSession("es", items));
    clearSession();
    expect(loadSession("es")).toBeNull();
  });
});

describe("parseStoredSession", () => {
  it("rejects nonsense rather than trusting it", () => {
    expect(parseStoredSession(null)).toBeNull();
    expect(parseStoredSession("not json")).toBeNull();
    expect(parseStoredSession("{}")).toBeNull();
    expect(
      parseStoredSession(JSON.stringify({ id: "x", language: "klingon" })),
    ).toBeNull();
  });

  it("clamps an index that has drifted past the items", () => {
    const stored = JSON.stringify({
      ...startSession("es", items),
      index: 99,
    });

    expect(parseStoredSession(stored)?.index).toBe(items.length);
  });

  it("rejects a session whose items were written by an older shape", () => {
    const stored = JSON.stringify({
      ...startSession("es", items),
      items: [{ id: "sound:rr" }],
    });

    expect(parseStoredSession(stored)).toBeNull();
  });
});
