import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A hello's speakers and an iPhone's silent switch

   speak() asks for playback audio on an iPhone or iPad
   (tests/speechSilentSwitch.test.ts). The hello page — where a first-time
   visitor is most likely to think it broken — also says once, after the
   first tap, to check the switch, for a phone where that is not enough.
   Nowhere else does it say so.
   ========================================================= */

const speech = vi.hoisted(() => ({ speak: vi.fn(), stopSpeech: vi.fn() }));

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

function asDevice(agent: string, touchPoints: number) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(agent);
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, get: () => touchPoints });
}

beforeEach(() => {
  speech.speak.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("the silent-switch hint", () => {
  it("appears on an iPhone after the first tap, and not before", () => {
    asDevice(IPHONE, 5);
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    expect(screen.queryByText(/isn’t on silent/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));
    expect(speech.speak).toHaveBeenCalled();
    expect(screen.getByText("No sound? Check that your iPhone isn’t on silent.")).toBeTruthy();
  });

  it("never appears anywhere else", () => {
    asDevice(MAC, 0);
    render(<HelloInvitation hello={FIXTURE_LIBRARY} />);
    fireEvent.click(screen.getByRole("button", { name: /Play the English pronunciation/ }));
    expect(screen.queryByText(/isn’t on silent/)).toBeNull();
  });
});
