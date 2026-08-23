import { readFileSync } from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import YumiLogo from "@/components/ui/YumiLogo";

import {
  CONSTRUCTION,
  YUMI_TIERS,
  yumiMarkGeometry,
  type YumiTier,
} from "@/lib/brand/yumiMark";
import {
  renderYumiFaviconSvg,
  renderYumiIconSvg,
  renderYumiLogoSvg,
} from "@/lib/brand/yumiMarkSvg";

/*
 * What these hold is the mark's construction, not its appearance — nothing
 * here can tell you whether the logo is any good. They exist because the
 * geometry is computed from a handful of ratios, and a plausible-looking edit
 * to one of them can quietly break a relationship the mark depends on: the
 * axis stops merging and grows a visible cap, the pupil runs out of room to
 * move, the eye drifts off the arc's own circle.
 *
 * The bands in the brief's §11 are deliberately *not* asserted. They cannot
 * all be met at once — see the note above CONSTRUCTION in lib/brand/yumiMark.ts
 * — so pinning them would only pin the wrong mark.
 */

const geometry = yumiMarkGeometry();

describe("the mark's composition", () => {
  it("opens to the right", () => {
    // Both terminals sit on the right of the arc's centre, so the mouth can
    // only face one way. This is the mark's direction: Yumi looking out.
    expect(geometry.arc.terminals.top[0]).toBeGreaterThan(geometry.arc.cx);
    expect(geometry.arc.terminals.bottom[0]).toBeGreaterThan(geometry.arc.cx);
    expect(geometry.arc.terminals.top[1]).toBeLessThan(geometry.arc.cy);
    expect(geometry.arc.terminals.bottom[1]).toBeGreaterThan(geometry.arc.cy);
  });

  it("puts the eye where the arc would have closed", () => {
    // The eye's centre is one arc radius out along the axis, which is to say
    // on the arc's own centreline. One circle describes the whole mark.
    const distance = Math.hypot(
      geometry.eye.cx - geometry.arc.cx,
      geometry.eye.cy - geometry.arc.cy
    );
    expect(distance).toBeCloseTo(geometry.arc.r, 1);
    expect(geometry.eye.cy).toBeCloseTo(geometry.arc.cy, 5);
  });

  it("keeps daylight between the terminals and the eye", () => {
    // The opening has to stay legible as an opening. Too tight and the mark
    // closes into a ring; the brief's own warning is that the arcs must not
    // crowd the eye.
    const clearance =
      Math.hypot(
        geometry.eye.cx - geometry.arc.terminals.top[0],
        geometry.eye.cy - geometry.arc.terminals.top[1]
      ) -
      geometry.strokes.main / 2 -
      geometry.eye.outerRadius;

    expect(clearance / geometry.logo.width).toBeGreaterThan(0.08);
    expect(clearance / geometry.logo.width).toBeLessThan(0.2);
  });
});

describe("the connection axis", () => {
  /** How far a horizontal line at `dy` off centre reaches into a circle. */
  const reach = (radius: number, dy: number) =>
    Math.sqrt(Math.max(0, radius * radius - dy * dy));

  it("finishes inside the arc's ink, so its cap never shows", () => {
    for (const dy of [0, geometry.strokes.main / 2]) {
      const outer = geometry.arc.cx - reach(geometry.arc.r + geometry.strokes.main / 2, dy);
      const inner = geometry.arc.cx - reach(geometry.arc.r - geometry.strokes.main / 2, dy);
      expect(geometry.connector.x1).toBeGreaterThan(outer);
      expect(geometry.connector.x1).toBeLessThan(inner);
    }
  });

  it("finishes inside the ring's ink without entering the eye's field", () => {
    for (const dy of [0, geometry.strokes.main / 2]) {
      const outer = geometry.eye.cx - reach(geometry.eye.outerRadius, dy);
      const field = geometry.eye.cx - reach(geometry.eye.fieldRadius, dy);
      expect(geometry.connector.x2).toBeGreaterThan(outer);
      expect(geometry.connector.x2).toBeLessThan(field);
    }
  });
});

describe("the eye", () => {
  it("reads as three bands rather than a disc", () => {
    // Ring, field, pupil. The moment the pupil fills the field the eye stops
    // being an eye, which is what the brief's baseline ratios would have done.
    const field = geometry.eye.fieldRadius - geometry.pupil.r;
    expect(geometry.pupil.r / geometry.eye.fieldRadius).toBeGreaterThan(0.35);
    expect(geometry.pupil.r / geometry.eye.fieldRadius).toBeLessThan(0.65);
    expect(field).toBeGreaterThan(geometry.strokes.ring / 3);
  });

  it("leaves the pupil room to look around", () => {
    // The look animation moves the pupil by up to 12% of the eye's radius.
    // At full travel, in any direction, it must still clear the ring.
    const travel = geometry.eye.outerRadius * 0.12;
    expect(geometry.pupil.r + travel).toBeLessThan(geometry.eye.fieldRadius);
  });

  it("holds the catchlight inside the pupil, up and to the right", () => {
    const highlight = geometry.highlight;
    expect(highlight).not.toBeNull();
    if (!highlight) return;

    expect(highlight.cx).toBeGreaterThan(geometry.pupil.cx);
    expect(highlight.cy).toBeLessThan(geometry.pupil.cy);

    const reach =
      Math.hypot(highlight.cx - geometry.pupil.cx, highlight.cy - geometry.pupil.cy) +
      highlight.r;
    expect(reach).toBeLessThan(geometry.pupil.r * 0.8);

    const ratio = (highlight.r * 2) / (geometry.pupil.r * 2);
    expect(ratio).toBeCloseTo(CONSTRUCTION.highlightRatio, 2);
  });
});

describe("the tiers", () => {
  const tiers = Object.keys(YUMI_TIERS) as YumiTier[];

  it("all keep arc, axis and eye — the mark has no optional parts", () => {
    for (const tier of tiers) {
      const svg = renderYumiLogoSvg({ tier });
      expect(svg).toContain('id="yumi-arc"');
      expect(svg).toContain('id="yumi-connector"');
      expect(svg).toContain('id="yumi-eye-outer-ring"');
      expect(svg).toContain('id="yumi-eye-pupil"');
    }
  });

  it("all draw the same silhouette", () => {
    // Different sizes, different weights, one shape. If a tier's aspect ratio
    // drifts it is no longer the same logo, only a similar one.
    const shapes = tiers.map((tier) => {
      const tierGeometry = yumiMarkGeometry(YUMI_TIERS[tier]);
      return tierGeometry.logo.width / tierGeometry.logo.height;
    });
    for (const shape of shapes) {
      expect(shape).toBeCloseTo(shapes[0], 2);
    }
  });

  it("drops only the catchlight at micro", () => {
    const micro = yumiMarkGeometry(YUMI_TIERS.micro);
    expect(micro.highlight).toBeNull();
    // One subpath rather than two: the pupil, with no hole punched in it.
    expect(micro.pupil.d.match(/M /g)).toHaveLength(1);
  });

  it("keeps the eye legible where micro is actually used", () => {
    // 32px is the size the brief names, and the size a favicon spends most of
    // its life at. Ring, field and pupil each have to clear a device pixel.
    const micro = yumiMarkGeometry({ canvas: 32, ...YUMI_TIERS.micro });
    expect(micro.strokes.ring).toBeGreaterThan(1);
    expect(micro.eye.fieldRadius - micro.pupil.r).toBeGreaterThan(1);
    expect(micro.pupil.r * 2).toBeGreaterThan(1);
  });
});

describe("the dark variant", () => {
  const dark = yumiMarkGeometry({ weight: "dark" });

  it("is a lighter drawing, not an inverted one", () => {
    const ratio = dark.strokes.main / geometry.strokes.main;
    expect(ratio).toBeGreaterThan(0.96);
    expect(ratio).toBeLessThan(0.98);
    expect(dark.strokes.ring / geometry.strokes.ring).toBeCloseTo(ratio, 2);
  });

  it("occupies the same box, so the two are interchangeable", () => {
    expect(dark.logo).toEqual(geometry.logo);
    expect(dark.arc.cx).toBeCloseTo(geometry.arc.cx, 5);
    expect(dark.eye.cx).toBeCloseTo(geometry.eye.cx, 5);
  });
});

describe("the app icon", () => {
  it("leaves the breathing room the home screen needs", () => {
    const ratio = geometry.logo.width / geometry.canvas;
    expect(ratio).toBeGreaterThanOrEqual(0.42);
    expect(ratio).toBeLessThanOrEqual(0.52);
  });

  it("stays inside the crop an OS may apply to a maskable icon", () => {
    // The safe zone is a centred circle of 80% diameter. Every corner of the
    // logo's box has to sit inside it, or a platform that crops to a circle
    // takes a bite out of the mark.
    const centre = geometry.canvas / 2;
    const corners = [
      [geometry.logo.x, geometry.logo.y],
      [geometry.logo.x + geometry.logo.width, geometry.logo.y],
      [geometry.logo.x, geometry.logo.y + geometry.logo.height],
      [geometry.logo.x + geometry.logo.width, geometry.logo.y + geometry.logo.height],
    ];
    for (const [x, y] of corners) {
      expect(Math.hypot(x - centre, y - centre)).toBeLessThan(geometry.canvas * 0.4);
    }
  });

  it("is square artwork with no corner mask of its own", () => {
    const svg = renderYumiIconSvg({ mode: "light" });
    expect(svg).toContain('<rect width="1024" height="1024"');
    expect(svg).not.toContain("rx=");
    expect(svg).not.toContain("ry=");
  });
});

describe("the emitted SVG", () => {
  it("carries the layer names animation will reach for", () => {
    const svg = renderYumiLogoSvg();
    for (const id of [
      "yumi-logo",
      "yumi-arc",
      "yumi-connector",
      "yumi-eye",
      "yumi-eye-outer-ring",
      "yumi-eye-pupil",
    ]) {
      expect(svg).toContain(`id="${id}"`);
    }
  });

  it("is one colour, and that colour is the theme's", () => {
    const svg = renderYumiLogoSvg();
    expect(svg).toContain("currentColor");
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("holds nothing a renderer or a design tool can trip over", () => {
    const svg = renderYumiLogoSvg();
    for (const forbidden of [
      "<filter",
      "<mask",
      "<image",
      "clip-path",
      "transform=",
      "<metadata",
      "<defs",
    ]) {
      expect(svg).not.toContain(forbidden);
    }
  });

  it("gives the favicon its own ink, because a tab strip has no theme token", () => {
    const favicon = renderYumiFaviconSvg();
    expect(favicon).toContain("prefers-color-scheme: dark");
  });
});

describe("the committed assets", () => {
  /*
   * The brand tree is generated. This is what stops a hand-edit — or a change
   * to the geometry that nobody re-ran the generator for — from leaving the
   * app icon, the favicon and the brand assets drawing three different marks.
   */
  const read = (relativePath: string) =>
    readFileSync(path.join(process.cwd(), relativePath), "utf8");

  it("match what the generator would write today", () => {
    expect(read("public/yumi-brand/master/yumi-logo-master.svg")).toBe(
      renderYumiLogoSvg()
    );
    expect(read("public/yumi-brand/micro/yumi-micro.svg")).toBe(
      renderYumiLogoSvg({ tier: "micro", size: 64 })
    );
    expect(read("public/yumi-brand/favicon/favicon.svg")).toBe(renderYumiFaviconSvg());
    expect(read("app/icon.svg")).toBe(renderYumiFaviconSvg());
  });
});

describe("<YumiLogo />", () => {
  it("paints in the theme's ink and nothing else", () => {
    const markup = renderToStaticMarkup(createElement(YumiLogo));
    expect(markup).toContain("currentColor");
    expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("is decorative unless it is given a name", () => {
    expect(renderToStaticMarkup(createElement(YumiLogo))).toContain(
      'aria-hidden="true"'
    );

    const named = renderToStaticMarkup(
      createElement(YumiLogo, { title: "Exchange Notes" })
    );
    expect(named).toContain('role="img"');
    expect(named).toContain("<title>Exchange Notes</title>");
    expect(named).not.toContain("aria-hidden");
  });

  it("hands out the layers animation needs", () => {
    const markup = renderToStaticMarkup(
      createElement(YumiLogo, {
        parts: { arc: "arc", connector: "axis", eye: "eye", ring: "ring", pupil: "pupil" },
      })
    );
    for (const className of ["arc", "axis", "eye", "ring", "pupil"]) {
      expect(markup).toContain(`class="${className}"`);
    }
  });
});
