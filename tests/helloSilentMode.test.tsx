import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A hello's speakers and an iPhone's silent switch

   With the ringer on silent, iOS mutes Safari's speech (Chi, 2026-10-19).
   On an iPhone or iPad, each tap first asks for playback audio — the
   Audio Session API, then a moment of silence through an <audio> element —
   in the tap itself and before the word is spoken, and the card says once
   to check the switch. Anywhere else, neither: a Mac would show the silent
   clip in Now Playing.
   ========================================================= */

const order = vi.hoisted(() => [] as string[]);
const speech = vi.hoisted(() => ({
  speak: vi.fn(() => {
    order.push("speak");
  }),
  stopSpeech: vi.fn(),
}));

vi.mock("@/lib/speech", async (original) => ({
  ...(await original<typeof import("@/lib/speech")>()),
  speak: speech.speak,
  stopSpeech: speech.stopSpeech,
  speechSupported: () => true,
}));
vi.mock("@/components/hello/HelloYumi", () => ({ default: () => null }));

const { default: HelloInvitation } = await import("@/components/hello/HelloInvitation");
const { FIXTURE_LIBRARY } = await import("@/lib/hello/fixtures");

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const play = vi.fn(() => {
  order.push("silence");
  return Promise.resolve();
});

function asDevice(agent: string, touchPoints: number) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(agent);
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, get: () => touchPoints });
}

beforeEach(() => {
  order.length = 0;
  speech.speak.mockClear();
  play.mockClear();
  /* tests/setup.ts stands in a bare Audio; this one can be told playsinline. */
  vi.stubGlobal(
    "Audio",
    class {
      currentTime = 0;
      preload = "";
      setAttribute() {}
      play = play;
    },
  );
  URL.createObjectURL = vi.fn(() => "blob:silence");
  Object.defineProperty(navigator, "audioSession", { configurable: true, value: { type: "auto" } });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

async function page() {
  render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
}

describe("on an iPhone", () => {
  it("asks for playback audio in the tap, before speaking, and says to check the switch", async () => {
    asDevice(IPHONE, 5);
    await page();
    expect(screen.queryByText(/isn’t on silent/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));

    expect((navigator as Navigator & { audioSession: { type: string } }).audioSession.type).toBe("playback");
    expect(order).toEqual(["silence", "speak"]);
    expect(screen.getByText("No sound? Check that your iPhone isn’t on silent.")).toBeTruthy();
  });

  it("also on an iPad that says it is a Mac", async () => {
    asDevice(MAC, 5);
    await page();
    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));
    expect(play).toHaveBeenCalled();
  });
});

describe("anywhere else", () => {
  it("speaks without either, and says nothing about a switch", async () => {
    asDevice(MAC, 0);
    await page();
    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));
    expect(order).toEqual(["speak"]);
    expect((navigator as Navigator & { audioSession: { type: string } }).audioSession.type).toBe("auto");
    expect(screen.queryByText(/isn’t on silent/)).toBeNull();
  });
});
