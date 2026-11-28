import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({ t: english, language: "english" }),
}));

import MicCheckSheet from "@/components/settings/MicCheckSheet";
import MicGuideSheet from "@/components/voice/MicGuide";
import { setVoiceDeaf, voiceStage } from "@/lib/voice/signal";

/* =========================================================
   Where to turn the microphone on, and the check-up (Chi, 2026-11-27:
   我不知道要去哪裡打開這設定)
   ========================================================= */

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
const guide = english.lexicon.voice.guide;
const track = { stop: vi.fn() };

function iphone(getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal("navigator", {
    userAgent: IPHONE,
    vendor: "Apple Computer, Inc.",
    standalone: true,
    onLine: true,
    mediaDevices: { getUserMedia: vi.fn(getUserMedia) },
  });
}

beforeEach(() => setVoiceDeaf(false));
afterEach(() => vi.unstubAllGlobals());

describe("the guide", () => {
  it("starts with the steps for the Home Screen app on an iPhone, and the others are a tap away", () => {
    iphone(async () => ({ getTracks: () => [track] }));
    render(<MicGuideSheet open onClose={vi.fn()} />);
    expect(screen.getByText(guide.platforms["ios-home"])).toBeTruthy();
    for (const step of guide.steps["ios-home"]) expect(screen.getByText(step)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: guide.platforms["ios-app"] }));
    expect(screen.getByText(guide.steps["ios-app"][2])).toBeTruthy();
  });

  it("tries the microphone from the tap, says it works, and takes the earmuffs off", async () => {
    setVoiceDeaf(true);
    iphone(async () => ({ getTracks: () => [track] }));
    render(<MicGuideSheet open onClose={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: guide.retry })); });
    expect(screen.getByText(guide.works)).toBeTruthy();
    expect(voiceStage.deaf).toBe(false);
    expect(track.stop).toHaveBeenCalled();
  });

  it("says it is still blocked when it is", async () => {
    iphone(async () => { throw Object.assign(new Error("no"), { name: "NotAllowedError" }); });
    render(<MicGuideSheet open onClose={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: guide.retry })); });
    expect(screen.getByText(guide.stillDenied)).toBeTruthy();
    expect(voiceStage.deaf).toBe(true);
  });
});

describe("the check-up", () => {
  it("names the broken link and shows the way to turn it on", async () => {
    iphone(async () => { throw Object.assign(new Error("no"), { name: "NotAllowedError" }); });
    render(<MicCheckSheet open onClose={vi.fn()} />);
    const copy = english.settings.microphone;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.start })); });

    expect(screen.getByText(english.lexicon.voice.micDenied)).toBeTruthy();
    expect(screen.getByText(copy.howTo)).toBeTruthy();
    expect(screen.getByText(guide.steps["ios-home"][0])).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.again })).toBeTruthy();
  });
});
