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
  it("sweeps a band down the inside of the target", () => {
    /*
     * The half that answers "is this working" from across a room. A light
     * on the edge alone was reported as not obvious enough.
     */
    const { container } = overlay({ busy: true });

    const band = container.querySelector("[class*='band']");

    expect(band).not.toBeNull();
  });

  it("clips the band to the target so it cannot spill onto the picture", () => {
    const { container } = overlay({ busy: true });

    expect(container.querySelector("[class*='bandClip']")).not.toBeNull();
  });

  it("runs a light round the target's own edge", () => {
    // The quieter half: it says precisely which rectangle is being read.
    const { container } = overlay({ busy: true });

    const edge = container.querySelector("svg rect");

    expect(edge).not.toBeNull();
    expect(edge?.getAttribute("class")).toMatch(/edgeStroke/);
  });

  it("stops everything travelling under reduced motion", () => {
    /*
     * Asserted against the stylesheet, because the rule lives in a media
     * query rather than in a class name the markup carries. The band is
     * removed outright — its whole purpose is movement, and left static it
     * would be a stripe across the middle of the picture.
     */
    const css = readFileSync(
      join(process.cwd(), "components/camera/TargetOverlay.module.css"),
      "utf8",
    );

    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));

    expect(reduced).toContain("display: none");
    expect(reduced).toContain("animation: none");
  });

  it("normalises the perimeter so the journey is the same at any shape", () => {
    /*
     * pathLength=100 is what lets one keyframe describe a wide target and a
     * tall one identically. Without it the dash pattern is in user units and
     * the light crawls on a big box and races on a small one.
     */
    const { container } = overlay({ busy: true });

    expect(container.querySelector("svg rect")).toHaveAttribute(
      "pathLength",
      "100",
    );
  });

  it("scans the target and not the whole viewfinder", () => {
    /*
     * The spec rules out a line sweeping the frame by name, and it would
     * also be untrue — nothing is reading the rest of the picture. The scan
     * lives inside the selected target's own element.
     */
    const { container } = overlay({ busy: true });

    const selected = screen.getByRole("img", { name: copy.selectedLabel });

    expect(selected.contains(container.querySelector("svg"))).toBe(true);
  });

  it("keeps both signals inside the target, never across the frame", () => {
    /*
     * The brief rules out a line sweeping the viewfinder by name, and it
     * would also be untrue: nothing is reading the rest of the picture.
     */
    const { container } = overlay({ busy: true });

    const selected = screen.getByRole("img", { name: copy.selectedLabel });

    expect(selected.contains(container.querySelector("[class*='band']"))).toBe(true);
    expect(selected.contains(container.querySelector("svg"))).toBe(true);
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

  it("shows nothing to scan when no target was chosen", () => {
    // Recognition can run on the centre default with no explicit selection.
    const { container } = overlay({ busy: true, selected: null });

    expect(container.querySelector("svg rect")).toBeNull();
  });
});
