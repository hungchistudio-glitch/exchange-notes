import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TargetOverlay from "@/components/camera/TargetOverlay";
import type { NormalizedRect } from "@/lib/media/geometry";

/* =========================================================
   What the viewfinder shows while the model is thinking

   The wait is the model's and it is three to seven seconds — measured
   against gemini-3.1-flash-lite, and not reducible by any parameter this
   app controls: `thinking_level: "none"` is rejected outright, and dropping
   the image resolution bought about ten percent, inside the noise.

   So the wait cannot be made shorter and has to be made legible. These
   tests hold the two halves of that: something moves, and it moves on the
   target rather than across the whole frame.
   ========================================================= */

const target: NormalizedRect = { x: 0.2, y: 0.3, width: 0.5, height: 0.25 };

const copy = {
  selectedLabel: "Selected target",
  candidateLabel: "Possible target",
};

function overlay(props: Partial<Parameters<typeof TargetOverlay>[0]> = {}) {
  return render(
    <TargetOverlay
      candidates={[target]}
      selected={target}
      selectedLabel={copy.selectedLabel}
      candidateLabel={copy.candidateLabel}
      {...props}
    />,
  );
}

describe("the target while nothing is happening", () => {
  it("draws the selected target and no scan", () => {
    const { container } = overlay({ busy: false });

    expect(screen.getByRole("img", { name: copy.selectedLabel })).toBeInTheDocument();
    expect(container.querySelector("svg rect")).toBeNull();
  });
});

describe("the target while the model is reading it", () => {
  /*
   * Chi, 2026-09-28: the target breathes ("目標框呼吸光") on the frozen
   * frame — corners and a soft glow swelling and settling together. It
   * replaced a sweeping band and a light running the edge.
   */
  it("breathes: the corners and a glow round the target", () => {
    const { container } = overlay({ busy: true });

    expect(container.querySelectorAll("[class*='breathing']")).toHaveLength(4);
    expect(container.querySelector("[class*='glow']")).not.toBeNull();
  });

  it("opens each corner outward from the target, so they move together", () => {
    const { container } = overlay({ busy: true });

    const origins = [...container.querySelectorAll<HTMLElement>("[class*='breathing']")].map(
      (corner) => corner.style.transformOrigin,
    );

    expect(new Set(origins).size).toBe(4);
  });

  it("keeps it inside the target, never across the frame", () => {
    /*
     * The brief rules out a line sweeping the viewfinder by name, and it
     * would also be untrue: nothing is reading the rest of the picture.
     */
    const { container } = overlay({ busy: true });

    const selected = screen.getByRole("img", { name: copy.selectedLabel });

    expect(selected.contains(container.querySelector("[class*='glow']"))).toBe(true);
    expect(container.querySelector("[class*='band']")).toBeNull();
  });

  it("stops breathing under reduced motion, and holds bright instead", () => {
    const css = readFileSync(
      join(process.cwd(), "components/camera/TargetOverlay.module.css"),
      "utf8",
    );

    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));

    expect(reduced).toContain("animation: none");
    expect(reduced).toContain("opacity: 1");
  });

  it("does not breathe when nothing is being read", () => {
    const { container } = overlay({ busy: false });

    expect(container.querySelector("[class*='breathing']")).toBeNull();
    expect(container.querySelector("[class*='glow']")).toBeNull();
  });

  it("takes the candidates down so one thing is being worked on", () => {
    const { container } = overlay({ busy: true });

    const outlines = [...container.querySelectorAll("div[role='img']")].filter(
      (node) => node.getAttribute("aria-label") === copy.candidateLabel,
    );

    outlines.forEach((outline) =>
      expect((outline as HTMLElement).style.opacity).toBe("0"),
    );
  });

  it("shows nothing to read when no target was chosen", () => {
    // Recognition can run on the centre default with no explicit selection.
    const { container } = overlay({ busy: true, selected: null });

    expect(container.querySelector("[class*='glow']")).toBeNull();
  });
});
