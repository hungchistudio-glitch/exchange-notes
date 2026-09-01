import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_APP_FONT_SIZE,
  rootFontSizeFor,
  type AppFontSize,
} from "@/lib/appPreferences";

/* =========================================================
   The font size setting has to be worth having

   Reported as "the three sizes don't seem to do anything", and measured in
   the browser rather than argued about. Two things were true.

   The range was 15 / 16 / 17px — one pixel either side of the default. On
   ordinary body text that is 1.75px between the smallest setting and the
   largest, which nobody can see.

   And it would not have mattered if it were wider, because 576 font sizes
   across the app were written in hard pixels. Between 47 and 80 percent of
   the text on a given screen ignored the setting completely, however far it
   was moved. Those are rem now.

   Both halves need a guard, and the second is the one that rots: a range is
   changed deliberately, but a `text-[13px]` gets typed by accident in any
   new component and silently opts that text out of the setting forever.
   ========================================================= */

const SIZES: AppFontSize[] = ["small", "medium", "large"];

function px(size: AppFontSize) {
  return Number.parseFloat(rootFontSizeFor(size));
}

describe("the three sizes", () => {
  it("are far enough apart for a reader to see", () => {
    /*
     * The old range was six percent. Twenty is about where a change stops
     * being something you have to look for — the number is a floor, so
     * widening it further is fine and narrowing it back is not.
     */
    const spread = px("large") / px("small");

    expect(spread).toBeGreaterThan(1.2);
  });

  it("go in the order their names promise", () => {
    expect(px("small")).toBeLessThan(px("medium"));
    expect(px("medium")).toBeLessThan(px("large"));
  });

  it("leaves medium at the browser default", () => {
    // 16px is what every unstyled page in the world is, and what the app's
    // designs were drawn against. Only the two ends move.
    expect(px(DEFAULT_APP_FONT_SIZE)).toBe(16);
  });

  it("stays in a range a phone can lay out", () => {
    for (const size of SIZES) {
      expect(px(size)).toBeGreaterThanOrEqual(12);
      expect(px(size)).toBeLessThanOrEqual(22);
    }
  });
});

/** Every source file the setting is supposed to reach. */
function grep(pattern: string, include: string) {
  try {
    return execFileSync(
      "grep",
      ["-rnE", pattern, `--include=${include}`, "app", "components"],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    // grep exits 1 when it finds nothing, which is the passing case here.
    return [];
  }
}

describe("nothing opts itself out of the setting", () => {
  it("has no hard-pixel font sizes in JSX", () => {
    /*
     * `text-[13px]` is the one that got typed 480 times. It renders
     * identically to `text-[0.8125rem]` at the default and then refuses to
     * move for the rest of the app's life.
     */
    expect(grep("text-\\[[0-9.]+px\\]", "*.tsx")).toEqual([]);
  });

  it("has no hard-pixel line heights in JSX", () => {
    // A line-height that does not follow its font is how bigger text starts
    // colliding with the line above it.
    expect(grep("leading-\\[[0-9.]+px\\]", "*.tsx")).toEqual([]);
  });

  it("has no hard-pixel font sizes in stylesheets", () => {
    expect(grep("font-size:\\s*[0-9.]+px", "*.css")).toEqual([]);
  });
});

describe("the one place pixels are still right", () => {
  it("keeps a real 16px floor under form fields", () => {
    /*
     * iOS Safari zooms the page whenever a focused input is under 16px, so
     * this rule is a floor rather than a size — as a plain 1rem it would be
     * 14px on "small" and every tap into a text field would zoom the whole
     * app, which is the exact behaviour the rule exists to prevent.
     *
     * max() keeps both halves: the reader's setting can raise it, nothing
     * can lower it.
     */
    const globals = readFileSync("app/globals.css", "utf8");

    expect(globals).toContain("font-size: max(16px, 1rem)");
  });

  it("still scopes that floor to touch devices", () => {
    // On a pointer device the floor is pointless and would override the
    // reader's small setting in every form in the app.
    const globals = readFileSync("app/globals.css", "utf8");
    const floorAt = globals.indexOf("font-size: max(16px, 1rem)");
    const mediaAt = globals.lastIndexOf("@media (pointer: coarse)", floorAt);

    expect(mediaAt).toBeGreaterThan(-1);
    expect(globals.slice(mediaAt, floorAt)).not.toContain("}\n}");
  });
});
