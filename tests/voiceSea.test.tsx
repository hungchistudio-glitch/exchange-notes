import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import VoiceSea from "@/components/voice/VoiceSea";
import { SEA_FRAGMENT, SEA_PALETTES } from "@/lib/voice/sea";
import { createBandReader, levelFromRms, resetVoiceSignal, voiceSignal } from "@/lib/voice/signal";

/* =========================================================
   The sea that listens (Chi, 2026-11-12: "非常液態，並隨著收音改變液態
   波動"; chose the liquid sea, moved by loudness and pitch, pearl and
   honey by day, aurora in Cosmic). jsdom has no WebGL, so the sea's own
   drawing is checked on a real browser; here, what it is told and what
   stands in for it.
   ========================================================= */

afterEach(() => {
  resetVoiceSignal();
  vi.restoreAllMocks();
});

describe("the voice, as the sea hears it", () => {
  it("reads loudness as the search's meter always has: quick up, slow down", () => {
    const loud = levelFromRms(0.2, 0);
    expect(loud).toBeGreaterThan(0.5);
    expect(levelFromRms(0, loud)).toBeLessThan(loud);
    expect(levelFromRms(0, loud)).toBeGreaterThan(loud * 0.85);
    expect(levelFromRms(1e-6, 0)).toBe(0);
  });

  it("splits the voice into a low swell and a high hiss", () => {
    const bins = 512;
    const spectrum = new Uint8Array(bins);
    const analyser = {
      frequencyBinCount: bins,
      fftSize: bins * 2,
      context: { sampleRate: 48000 },
      getByteFrequencyData: (out: Uint8Array) => out.set(spectrum),
    } as unknown as AnalyserNode;
    const reader = createBandReader(analyser);
    const hz = 48000 / (bins * 2);

    /* A low hum: only the low band. */
    spectrum.fill(30);
    for (let i = Math.round(100 / hz); i <= Math.round(380 / hz); i++) spectrum[i] = 230;
    for (let frame = 0; frame < 20; frame++) reader.read(0.6);
    expect(voiceSignal.level).toBe(0.6);
    expect(voiceSignal.low).toBeGreaterThan(0.7);
    expect(voiceSignal.high).toBe(0);

    /* Then a hiss: the high band rises, the low one falls away. */
    spectrum.fill(30);
    for (let i = Math.round(2100 / hz); i <= Math.round(6900 / hz); i++) spectrum[i] = 230;
    for (let frame = 0; frame < 30; frame++) reader.read(0.4);
    expect(voiceSignal.high).toBeGreaterThan(0.7);
    expect(voiceSignal.low).toBeLessThan(0.05);

    resetVoiceSignal();
    expect(voiceSignal).toEqual({ level: 0, low: 0, high: 0 });
  });

  it("is pearl and honey by day and aurora in Cosmic", () => {
    const [r, g, b] = SEA_PALETTES.day.deep;
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    const [cr, cg, cb] = SEA_PALETTES.cosmic.body;
    expect(cg).toBeGreaterThan(cr);
    expect(cb).toBeGreaterThan(cr);
    expect(SEA_PALETTES.cosmic.deep[2]).toBeGreaterThan(SEA_PALETTES.cosmic.deep[1]);
    /* Loudness, the low band and the high band all reach the surface. */
    for (const uniform of ["uLevel", "uLow", "uHigh", "uCalm", "uFill"]) expect(SEA_FRAGMENT).toContain(uniform);
  });
});

describe("the sea on the page", () => {
  it("lies over the bottom of the screen, takes no taps, and stands a still glow in where it cannot be drawn", async () => {
    /* jsdom draws nothing: the sea falls back to its glow, which follows the phase. */
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { rerender } = render(<VoiceSea phase="idle" />);
    const canvas = document.body.querySelector("canvas")!;
    const glow = canvas.nextElementSibling as HTMLElement;
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("data-on", "false");
    expect(glow.dataset.on).toBe("idle");

    await act(async () => { rerender(<VoiceSea phase="listening" />); });
    expect(canvas).toHaveAttribute("data-on", "false");
    expect(glow.dataset.on).toBe("listening");

    await act(async () => { rerender(<VoiceSea phase="understanding" />); });
    expect(glow.dataset.on).toBe("understanding");

    await act(async () => { rerender(<VoiceSea phase="idle" />); });
    expect(glow.dataset.on).toBe("idle");
  });
});
