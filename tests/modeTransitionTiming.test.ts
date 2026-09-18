import { describe, expect, it } from "vitest";

import { lastNodeEndsAt } from "@/components/cosmic/ModeTransitionStage";
import {
  ENTER_TOTAL_MS,
  LEAVE_TOTAL_MS,
} from "@/contexts/InterfaceModeContext";

/*
 * The scene and its contents are timed in two different files.
 *
 * How long the mode change lasts is a property of the context, which owns the
 * timers and unmounts the stage; how long the six systems take to come online
 * is a property of the component that staggers them. Nothing connected the
 * two, and they disagreed: the checklist ran to 1430ms inside a scene that
 * ends at 1150, so the last four dots were still lit when the stage was
 * removed — over a deck the veil had already stopped covering. Standing down
 * disagreed harder, with the sixth dot's delay landing after its whole scene
 * was over, so it held its opening frame and then disappeared.
 *
 * Neither is a crash and neither is visible in a still, which is why it
 * survived several rounds of work on this sequence. So it is asserted rather
 * than watched for.
 */
describe("mode transition choreography", () => {
  it("finishes lighting the six systems before the entering scene ends", () => {
    expect(lastNodeEndsAt("entering-cosmic")).toBeLessThanOrEqual(
      ENTER_TOTAL_MS,
    );
  });

  it("finishes shutting them down before the leaving scene ends", () => {
    expect(lastNodeEndsAt("leaving-cosmic")).toBeLessThanOrEqual(
      LEAVE_TOTAL_MS,
    );
  });

  /*
   * The other direction. A checklist that is over long before its scene is
   * not cut off, but it is not a checklist either — it reads as a flash near
   * the start followed by a wait, and the stagger exists precisely so that it
   * does not. Half the scene is the loosest bound worth holding.
   */
  it("uses the scene it is given rather than flashing at the start of it", () => {
    expect(lastNodeEndsAt("entering-cosmic")).toBeGreaterThan(
      ENTER_TOTAL_MS / 2,
    );
    expect(lastNodeEndsAt("leaving-cosmic")).toBeGreaterThan(
      LEAVE_TOTAL_MS / 2,
    );
  });
});
