import { afterEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The field stays above the keyboard

   Reported on 2026-09-27 with a screenshot: tapping the home search field on
   an iPhone raised the keyboard straight over it. She moved up only once
   there was an answer, and "up" was 20% of the layout viewport, which does
   not shrink for a keyboard. These pin where she sits against what is
   actually visible.
   ========================================================= */

const { answerAnchorY, visibleBottom } = await import(
  "@/components/home/yumi/YumiRingOverlay"
);

function withVisualViewport(height: number, offsetTop = 0) {
  vi.stubGlobal("visualViewport", { height, offsetTop });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("where she sits while the reader types or reads", () => {
  it("is where it always was when no keyboard is up", () => {
    withVisualViewport(844);

    expect(visibleBottom(844)).toBe(844);
    expect(answerAnchorY(844)).toBeCloseTo(844 * 0.2);
  });

  it("moves up into what the keyboard leaves visible", () => {
    // An 844px iPhone with the keyboard and its bar up: about 470px left.
    withVisualViewport(470);

    expect(visibleBottom(844)).toBe(470);

    const eye = answerAnchorY(844);
    expect(eye).toBeLessThan(844 * 0.2);
    // Her eye, the 94px to the field and the field itself all above the fold.
    expect(eye + 94 + 56).toBeLessThan(470);
  });

  it("never goes so high she runs into the status bar", () => {
    withVisualViewport(300);

    expect(answerAnchorY(844)).toBe(120);
  });
});
