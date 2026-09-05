import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useYumiFeedingSequence from "@/hooks/pet/useYumiFeedingSequence";
import type { Cookie } from "@/lib/pet/types";

/* =========================================================
   How long Yumi spends on one cookie

   The sequence used to run 4.2 seconds end to end — bite, four chews, a
   swallow, and then 2.3 seconds of a satisfied smile doing nothing — and
   both trays disabled themselves for every millisecond of it. Feeding was
   therefore a queue: one cookie, wait, one cookie, wait.

   Two things are pinned here. The mouthful is short enough that nobody is
   waiting on it, and the feed is *recorded* on the bite rather than on a
   timer that the next cookie's `clearTimers()` would cancel — which is how
   feeding quickly used to lose feeds outright.
   ========================================================= */

function cookie(id: string): Cookie {
  return {
    id,
    word: id,
    translation: id,
    type: "letter",
    glyph: id[0].toUpperCase(),
    status: "learning",
    isNew: false,
    reviewDue: false,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("one mouthful", () => {
  it("bites, chews four times, swallows and is done inside two seconds", () => {
    const eaten: string[] = [];
    const { result } = renderHook(() =>
      useYumiFeedingSequence({ onConsume: (c) => eaten.push(c.id) }),
    );

    act(() => {
      result.current.consume(cookie("a"));
    });
    expect(result.current.phase).toBe("biting");

    const seen: string[] = [];
    for (let elapsed = 0; elapsed <= 2_000; elapsed += 10) {
      act(() => {
        vi.advanceTimersByTime(10);
      });

      const beat = `${result.current.phase}:${result.current.chewBeat}`;
      if (seen[seen.length - 1] !== beat) seen.push(beat);
    }

    expect(seen).toEqual([
      "biting:0",
      "chewing:1",
      "chewing:2",
      "chewing:3",
      "chewing:4",
      "swallowing:4",
      "satisfied:4",
      "idle:0",
    ]);
    expect(result.current.isFeeding).toBe(false);
  });

  it("records the cookie on the bite, so a second one cannot cancel the first", () => {
    const eaten: string[] = [];
    const { result } = renderHook(() =>
      useYumiFeedingSequence({ onConsume: (c) => eaten.push(c.id) }),
    );

    // Two cookies released a hair apart — the second `consume` clears the
    // first's timers. It used to clear the first's *recording* with them.
    act(() => {
      result.current.consume(cookie("a"));
    });
    act(() => {
      vi.advanceTimersByTime(40);
      result.current.consume(cookie("b"));
    });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(eaten).toEqual(["a", "b"]);
    // The sequence restarts on the newest cookie rather than piling up.
    expect(result.current.phase).toBe("idle");
  });

  it("does not stay stuck waiting for a cookie that never lands", () => {
    // beginApproach opens Yumi's mouth. If the cookie's flight transition
    // never fires — cancelled pointer, backgrounded tab, torn-down element —
    // isFeeding used to stay true for the rest of the session, and the tray
    // was disabled off exactly that flag.
    const { result } = renderHook(() =>
      useYumiFeedingSequence({ onConsume: () => {} }),
    );

    act(() => {
      result.current.beginApproach(cookie("a"));
    });
    expect(result.current.phase).toBe("anticipating");

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.isFeeding).toBe(false);
  });
});
