import { describe, expect, it } from "vitest";

import { judgeEntrance } from "@/components/vocabulary/ShareSheetReview";

/* =========================================================
   A review screen that cannot claim a pass it did not earn

   The share sheet review watches the panel's height through the entrance and
   says whether it moved. The failure mode worth guarding is the one that
   looks like success: a sampler that never got a frame has seen exactly one
   height — none — which is indistinguishable from a sheet that held one.

   Caught in a real browser rather than imagined. Pointed at the pre-fix
   component in a tab the browser had throttled, the run took its first frame
   after the sheet had already grown, saw one height, and reported that the
   sheet held. It had not; nothing had looked.
   ========================================================= */

describe("judging an entrance", () => {
  it("says the sheet held when it saw enough frames and one height", () => {
    expect(
      judgeEntrance({
        entranceHeights: [294],
        entranceSamples: 23,
        restingHeight: 484,
      }),
    ).toEqual({ kind: "held", height: 294, restingHeight: 484 });
  });

  it("says the sheet moved when the height changed under it", () => {
    expect(
      judgeEntrance({
        entranceHeights: [294, 484],
        entranceSamples: 23,
        restingHeight: 484,
      }),
    ).toEqual({ kind: "moved", heights: [294, 484], restingHeight: 484 });
  });

  it("refuses to judge a run that barely sampled", () => {
    /* The false pass: one frame, one height, and nothing actually watched. */
    expect(
      judgeEntrance({
        entranceHeights: [484],
        entranceSamples: 1,
        restingHeight: 484,
      }),
    ).toEqual({ kind: "unmeasured", samples: 1 });
  });

  it("refuses to judge a run that never sampled at all", () => {
    expect(
      judgeEntrance({
        entranceHeights: [],
        entranceSamples: 0,
        restingHeight: 0,
      }),
    ).toEqual({ kind: "unmeasured", samples: 0 });
  });

  /*
   * A starved run that happens to straddle the change is still not evidence.
   * Two frames either side of a jump say the sheet moved, but they say
   * nothing about a sheet that did not — so the same bar applies to both.
   */
  it("holds a moved verdict to the same sampling bar", () => {
    expect(
      judgeEntrance({
        entranceHeights: [294, 484],
        entranceSamples: 2,
        restingHeight: 484,
      }),
    ).toEqual({ kind: "unmeasured", samples: 2 });
  });
});
