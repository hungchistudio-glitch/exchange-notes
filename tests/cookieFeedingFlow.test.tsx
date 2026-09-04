import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CookieTray from "@/components/vocabulary/pet/CookieTray";
import english from "@/lib/i18n/en";
import { applyFedCookie } from "@/lib/pet/repository";
import type { Cookie, PetState } from "@/lib/pet/types";

/* =========================================================
   Feeding Yumi, continuously, without losing a cookie

   Three things were wrong with the tray, and they compounded:

   1. The tray was `disabled` for the whole 4.2s feeding animation, so
      cookies had to be handed over one at a time.
   2. There was one drag slot. Picking up a second cookie while the first
      was still flying overwrote it — the first never landed and was never
      eaten. Only the lockout in (1) hid this.
   3. Move/up/cancel hung off the button and depended on pointer capture. A
      lost or refused capture froze the cookie mid-air with no release ever
      arriving; a pointercancel deleted the drag outright, after the feed had
      already been announced, leaving Yumi waiting forever.

   These cover the interaction, not the drawing: what a hand does, and which
   cookies end up eaten.
   ========================================================= */

const copy = english.vocabulary.mascot;

function cookie(id: string, word: string): Cookie {
  return {
    id,
    word,
    type: "letter",
    glyph: word[0].toUpperCase(),
    status: "learning",
    isNew: false,
    reviewDue: false,
  };
}

// jsdom lays nothing out, so every rect is 0×0 and Yumi's attraction radius
// would be zero. These are the numbers the drop test is written against.
function stubZone(element: HTMLElement, box: { x: number; y: number; size: number }) {
  element.getBoundingClientRect = () =>
    ({
      left: box.x,
      top: box.y,
      right: box.x + box.size,
      bottom: box.y + box.size,
      width: box.size,
      height: box.size,
      x: box.x,
      y: box.y,
      toJSON: () => ({}),
    }) as DOMRect;
}

type PointerInit = { pointerId: number; clientX: number; clientY: number };

function pointer(type: string, init: PointerInit) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX,
    clientY: init.clientY,
  });

  Object.defineProperty(event, "pointerId", { value: init.pointerId });

  return event;
}

function renderTray(cookies: Cookie[], onFeed: (cookie: Cookie) => void) {
  const zoneRef = createRef<HTMLDivElement>();

  const view = render(
    <div>
      <div ref={zoneRef} data-testid="zone" />
      <CookieTray
        cookies={cookies}
        yumiZoneRef={zoneRef}
        onFeed={onFeed}
        copy={copy}
      />
    </div>,
  );

  // Yumi sits at (400, 400), 200 across — so the attraction radius is 140.
  stubZone(screen.getByTestId("zone"), { x: 300, y: 300, size: 200 });

  return view;
}

function slotFor(word: string) {
  return screen.getByRole("button", {
    name: copy.feedAriaLabel.replace("{word}", word),
  });
}

function flyingGhosts() {
  return document.querySelectorAll("[data-attracted]");
}

// Drives one cookie from its slot into Yumi's mouth, leaving it mid-flight.
function dragToYumi(word: string, pointerId: number) {
  const slot = slotFor(word);

  act(() => {
    slot.dispatchEvent(pointer("pointerdown", { pointerId, clientX: 10, clientY: 500 }));
  });
  act(() => {
    window.dispatchEvent(pointer("pointermove", { pointerId, clientX: 200, clientY: 450 }));
  });
  act(() => {
    window.dispatchEvent(pointer("pointermove", { pointerId, clientX: 400, clientY: 400 }));
  });
  act(() => {
    window.dispatchEvent(pointer("pointerup", { pointerId, clientX: 400, clientY: 400 }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no rAF worth the name under fake timers; run callbacks on a
  // timer so `act` can flush them deterministically.
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) =>
    setTimeout(() => fn(0), 0) as unknown as number,
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("feeding Yumi one cookie after another", () => {
  it("takes a second cookie while the first is still in the air, and eats both", () => {
    const fed: string[] = [];
    renderTray(
      [cookie("a", "apple"), cookie("b", "bridge")],
      (c) => fed.push(c.id),
    );

    dragToYumi("apple", 1);
    // Mid-flight: the first cookie has left the tray but has not landed.
    expect(fed).toEqual([]);
    expect(flyingGhosts()).toHaveLength(1);

    // The hand does not wait. This used to overwrite the first drag, so
    // "apple" was never fed.
    dragToYumi("bridge", 2);
    expect(flyingGhosts()).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(fed).toEqual(["a", "b"]);
  });

  it("still feeds a cookie whose flight transition never fires", () => {
    const fed: string[] = [];
    renderTray([cookie("a", "apple")], (c) => fed.push(c.id));

    dragToYumi("apple", 1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(fed).toEqual(["a"]);
    expect(flyingGhosts()).toHaveLength(0);
  });

  it("sends a cookie home, un-fed, when the drag is released away from Yumi", () => {
    const fed: string[] = [];
    renderTray([cookie("a", "apple")], (c) => fed.push(c.id));

    const slot = slotFor("apple");

    act(() => {
      slot.dispatchEvent(pointer("pointerdown", { pointerId: 1, clientX: 10, clientY: 500 }));
    });
    act(() => {
      window.dispatchEvent(pointer("pointermove", { pointerId: 1, clientX: 60, clientY: 560 }));
    });
    act(() => {
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, clientX: 60, clientY: 560 }));
    });

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(fed).toEqual([]);
    expect(flyingGhosts()).toHaveLength(0);
  });

  it("does not strand a cookie when the gesture is cancelled mid-drag", () => {
    const started: string[] = [];
    const fed: string[] = [];

    const zoneRef = createRef<HTMLDivElement>();
    render(
      <div>
        <div ref={zoneRef} data-testid="zone" />
        <CookieTray
          cookies={[cookie("a", "apple")]}
          yumiZoneRef={zoneRef}
          onFeed={(c) => fed.push(c.id)}
          onFeedStart={(c) => started.push(c.id)}
          copy={copy}
        />
      </div>,
    );
    stubZone(screen.getByTestId("zone"), { x: 300, y: 300, size: 200 });

    const slot = slotFor("apple");

    act(() => {
      slot.dispatchEvent(pointer("pointerdown", { pointerId: 1, clientX: 10, clientY: 500 }));
    });
    act(() => {
      window.dispatchEvent(pointer("pointermove", { pointerId: 1, clientX: 200, clientY: 450 }));
    });
    // The browser takes the gesture away — a scroll, a system gesture, the
    // element re-rendering under the finger.
    act(() => {
      window.dispatchEvent(pointer("pointercancel", { pointerId: 1, clientX: 200, clientY: 450 }));
    });

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // Nothing was promised to Yumi, and nothing is left floating over the page.
    expect(started).toEqual([]);
    expect(fed).toEqual([]);
    expect(flyingGhosts()).toHaveLength(0);
  });

  it("keeps working after a drag whose pointer capture was refused", () => {
    const fed: string[] = [];
    renderTray([cookie("a", "apple")], (c) => fed.push(c.id));

    const slot = slotFor("apple");
    slot.setPointerCapture = () => {
      throw new Error("InvalidStateError");
    };

    dragToYumi("apple", 1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(fed).toEqual(["a"]);
  });
});

describe("recording what Yumi ate", () => {
  const base: PetState = {
    user_id: "u1",
    fed_word_ids: [],
    total_cookies_fed: 0,
    last_fed_at: null,
    last_opened_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("accumulates back-to-back feeds instead of one erasing the other", () => {
    // This is the shape the old read-modify-write got wrong: both feeds read
    // the same snapshot, so the second write dropped the first word and
    // counted one cookie instead of two.
    const afterTwo = applyFedCookie(applyFedCookie(base, "a"), "b");

    expect(afterTwo.fed_word_ids).toEqual(["a", "b"]);
    expect(afterTwo.total_cookies_fed).toBe(2);
  });

  it("is a no-op for a word already eaten", () => {
    const once = applyFedCookie(base, "a");

    expect(applyFedCookie(once, "a")).toBe(once);
  });
});

describe("activation paths that are not a pointer drag", () => {
  it("feeds once, not twice, when a click trails the pointer release", () => {
    const fed: string[] = [];
    renderTray([cookie("a", "apple")], (c) => fed.push(c.id));

    const slot = slotFor("apple");

    // A tap: down and up with no movement, which the tray treats as a feed.
    act(() => {
      slot.dispatchEvent(pointer("pointerdown", { pointerId: 1, clientX: 10, clientY: 500 }));
    });
    act(() => {
      window.dispatchEvent(pointer("pointerup", { pointerId: 1, clientX: 10, clientY: 500 }));
    });

    // The flight settles first — under reduced motion it settles in 60ms,
    // which a touch browser's synthesised click can easily trail.
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    act(() => {
      slot.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, clientX: 10, clientY: 500 }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(fed).toEqual(["a"]);
  });

  it("still feeds on a click that arrives with no pointer sequence at all", () => {
    const fed: string[] = [];
    renderTray([cookie("a", "apple")], (c) => fed.push(c.id));

    act(() => {
      slotFor("apple").dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(fed).toEqual(["a"]);
  });
});
