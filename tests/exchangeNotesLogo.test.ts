import { describe, expect, it } from "vitest";

import {
  APP_ICON_WIDTH_RATIO,
  CONSTRUCTION,
  ICON_PREVIEW_RADIUS_RATIO,
  LOGO_COLORS,
  LOGO_TIERS,
  exchangeNotesLogoGeometry,
} from "@/lib/brand/exchangeNotesLogo";
import {
  renderAppIconSvg,
  renderFaviconSvg,
  renderLogoSvg,
} from "@/lib/brand/exchangeNotesLogoSvg";

/* =========================================================
   The logo, measured

   These are the brand specification's own acceptance targets (§25), checked
   against the drawing the app actually ships. The point is not that the
   numbers are pretty: it is that a change to CONSTRUCTION which quietly
   breaks the drawn proportions fails here rather than in someone's eye three
   weeks later, on a home screen, after it has shipped.
   ========================================================= */

/** The master canvas the whole specification is written against. */
const master = exchangeNotesLogoGeometry({
  canvas: 1024,
  ...LOGO_TIERS.appIcon,
});

function near(actual: number, target: number, tolerance: number) {
  expect(Math.abs(actual - target)).toBeLessThanOrEqual(tolerance);
}

describe("the master canvas", () => {
  it("is 1024 square", () => {
    expect(master.canvas).toBe(1024);
  });

  it("puts the mark at 446 by 490", () => {
    near(master.logo.width, 446, 3);
    near(master.logo.height, 490, 3);
  });

  it("keeps the mark to about 44% of the canvas", () => {
    // §3 and §29: the surrounding negative space is part of the identity.
    // Not 55%, not 60%, not 70%.
    expect(APP_ICON_WIDTH_RATIO).toBeGreaterThanOrEqual(0.435);
    expect(APP_ICON_WIDTH_RATIO).toBeLessThanOrEqual(0.437);
  });

  it("centres it optically as one object", () => {
    // §4 and §25: the eye's rightward mass is intentional, and the mark is
    // not pushed left to compensate for it.
    near(master.logo.x + master.logo.width / 2, 512, 2);
    near(master.logo.y + master.logo.height / 2, 512, 2);
  });

  it("leaves about 28% of the canvas clear on each side", () => {
    near(master.logo.x / 1024, 0.282, 0.004);
    near((1024 - master.logo.x - master.logo.width) / 1024, 0.282, 0.004);
  });
});

describe("the strokes", () => {
  it("draws the main structure at about 54", () => {
    near(master.strokes.main, 54, 1);
  });

  it("draws the eye's ring far finer than the C", () => {
    // §8 is emphatic that these must not match — the ring has to read as more
    // refined than the heavy outer arc.
    near(master.strokes.ring, 21, 1);
    expect(master.strokes.ring).toBeLessThan(master.strokes.main / 2);
  });

  it("gives the bridge the same weight as the arc", () => {
    // §6: the connecting bar is never thinner than the shape it grows out of.
    // They are one stroke-width in the SVG, which is the strongest form of
    // "the same" available.
    const svg = renderLogoSvg();
    const widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) =>
      Number(m[1]),
    );

    // Two distinct weights in the whole mark: the structure, and the ring.
    expect(new Set(widths)).toEqual(
      new Set([master.strokes.main, master.strokes.ring]),
    );
  });
});

describe("the eye", () => {
  it("sits right of centre, and stays there", () => {
    // §7: the rightward displacement is fundamental. Not centred at 50% X.
    near(master.eye.cx, 616, 3);
    near(master.eye.cy, 512, 2);
    expect(master.eye.cx / 1024).toBeGreaterThan(0.59);
  });

  it("is 238 across", () => {
    near(master.eye.outerRadius * 2, 238, 2);
  });

  it("holds a 100 pupil with room around it", () => {
    near(master.pupil.r * 2, 100, 2);

    // §9: the pupil must not touch the ring. The field it lives in is what
    // stops the eye reading as a full stop with a hairline round it.
    expect(master.eye.fieldRadius - master.pupil.r).toBeGreaterThan(20);
  });

  it("keeps the catchlight small and off-centre", () => {
    // §10 and §27: never enlarged, never centred.
    near(master.highlight!.r * 2, 27, 1.5);
    near(master.highlight!.cx - master.pupil.cx, 15, 1);
    near(master.highlight!.cy - master.pupil.cy, -14, 1);
  });

  it("keeps the catchlight inside the pupil", () => {
    const offset = Math.hypot(
      master.highlight!.cx - master.pupil.cx,
      master.highlight!.cy - master.pupil.cy,
    );

    expect(offset + master.highlight!.r).toBeLessThan(master.pupil.r);
  });
});

describe("the arc and the bridge", () => {
  it("is a thick left arc of about 218", () => {
    near(master.arc.r, 218, 3);
    near(master.arc.cy, 512, 2);
  });

  it("opens toward the right", () => {
    // Both terminals right of the arc's centre, and level with each other.
    expect(master.arc.terminals.top[0]).toBeGreaterThan(master.arc.cx);
    expect(master.arc.terminals.top[0]).toBe(master.arc.terminals.bottom[0]);
    near(
      master.arc.cy - master.arc.terminals.top[1],
      master.arc.terminals.bottom[1] - master.arc.cy,
      0.1,
    );
  });

  it("lets the eye look out through the mouth", () => {
    // The reading that fixes the opening angle: the terminals fall between
    // the eye's left edge and its centre, so the eye's outer half is clear of
    // the C rather than the C wrapping round past it.
    const terminalX = master.arc.terminals.top[0];

    expect(terminalX).toBeGreaterThan(master.eye.cx - master.eye.outerRadius);
    expect(terminalX).toBeLessThan(master.eye.cx);
  });

  it("still curls inward rather than being a plain half ring", () => {
    // Past about 80° the mark stops reading as a C. §1 and §5 both call it
    // one, so this is a property of the drawing rather than a preference.
    expect(CONSTRUCTION.openingHalfAngle).toBeLessThan(80);
    expect(CONSTRUCTION.openingHalfAngle).toBeGreaterThan(68);
  });

  it("never lets the arc's ink touch the eye", () => {
    const clearance =
      Math.hypot(
        master.arc.terminals.top[0] - master.eye.cx,
        master.arc.terminals.top[1] - master.eye.cy,
      ) -
      master.eye.outerRadius -
      master.strokes.main / 2;

    expect(clearance).toBeGreaterThan(20);
  });

  it("merges into the arc at one end and the ring at the other", () => {
    // §6: no visible gap, and structurally continuous with the C. Both ends
    // finish inside another shape's ink, which is why they take butt caps.
    const arcBand = [
      master.arc.cx - master.arc.r - master.strokes.main / 2,
      master.arc.cx - master.arc.r + master.strokes.main / 2,
    ];

    expect(master.bridge.x1).toBeGreaterThan(arcBand[0]);
    expect(master.bridge.x1).toBeLessThan(arcBand[1]);

    expect(master.bridge.x2).toBeGreaterThan(
      master.eye.cx - master.eye.outerRadius,
    );
    expect(master.bridge.x2).toBeLessThan(master.eye.cx - master.eye.fieldRadius);
  });

  it("runs along the mark's own centre line", () => {
    near(master.bridge.y, master.arc.cy, 0.1);
    near(master.bridge.y, master.eye.cy, 0.1);
  });
});

/* =========================================================
   Light and dark are one drawing
   ========================================================= */

describe("light and dark", () => {
  it("differ in exactly two values", () => {
    // §24, and the whole reason the mark is one path set painted in
    // currentColor: dark mode is not a second logo.
    const light = renderAppIconSvg({ mode: "light" });
    const dark = renderAppIconSvg({ mode: "dark" });

    /*
     * Each mode's own two colours, not all four. White is both the light
     * canvas and the dark mark, so a single pass over every literal would
     * rewrite one mode's ink using the other mode's ground and report a
     * difference that is not there.
     */
    const normalise = (svg: string, canvas: string, mark: string) =>
      svg.replaceAll(canvas, "CANVAS").replaceAll(mark, "MARK");

    expect(
      normalise(light, LOGO_COLORS.canvasLight, LOGO_COLORS.markLight),
    ).toBe(normalise(dark, LOGO_COLORS.canvasDark, LOGO_COLORS.markDark));
  });

  it("uses the specified colours exactly", () => {
    expect(LOGO_COLORS.canvasLight).toBe("#ffffff");
    expect(LOGO_COLORS.markLight).toBe("#000000");
    expect(LOGO_COLORS.canvasDark).toBe("#0d0d11");
    expect(LOGO_COLORS.markDark).toBe("#ffffff");
  });

  it("scales one geometry rather than re-drawing per size", () => {
    // §18: proportional, on one aspect ratio, at every size.
    for (const size of [64, 128, 256, 512, 1024]) {
      const geometry = exchangeNotesLogoGeometry({
        canvas: size,
        ...LOGO_TIERS.appIcon,
      });

      near(geometry.logo.width / size, 446 / 1024, 0.001);
      near(geometry.logo.height / size, 490 / 1024, 0.001);
      near(geometry.strokes.main / size, 54 / 1024, 0.001);
    }
  });
});

/* =========================================================
   What the exported files may and may not contain
   ========================================================= */

describe("the exported artwork", () => {
  it("bakes no presentation effects into the mark", () => {
    // §17: no shadow, no gradient, no glow, no blur, no surrounding card.
    for (const svg of [
      renderLogoSvg(),
      renderAppIconSvg({ mode: "light" }),
      renderAppIconSvg({ mode: "dark" }),
      renderFaviconSvg(),
    ]) {
      expect(svg).not.toMatch(
        /filter|Gradient|feGaussianBlur|drop-shadow|opacity=/i,
      );
    }
  });

  it("leaves the app icon's corners square for the OS to mask", () => {
    // §16: the 12% rounding is a preview affordance and belongs nowhere near
    // an exported icon, which every platform masks itself.
    const icon = renderAppIconSvg({ mode: "light" });

    expect(icon).toContain(`<rect width="1024" height="1024"`);
    expect(icon).not.toMatch(/<rect[^>]*\brx=/);
    expect(ICON_PREVIEW_RADIUS_RATIO).toBe(0.12);
  });

  it("keeps the mark's own layers separable", () => {
    // §15: the C, the bridge and the eye stay conceptually distinct, which is
    // what a designer opening the file sees as layer names.
    const svg = renderLogoSvg();

    for (const id of [
      "exchange-notes-mark",
      "mark-arc",
      "mark-bridge",
      "mark-eye",
      "mark-eye-ring",
      "mark-eye-pupil",
    ]) {
      expect(svg).toContain(`id="${id}"`);
    }
  });

  it("paints the master in currentColor so one file serves both themes", () => {
    // §13 and §28: one geometry, coloured by whatever it is placed in.
    expect(renderLogoSvg()).toContain('stroke="currentColor"');
  });

  it("gives the favicon its own colour scheme, since a tab strip has no CSS", () => {
    // §21, done the one way that is reliable across platforms.
    const favicon = renderFaviconSvg();

    expect(favicon).toContain("prefers-color-scheme: dark");
    expect(favicon).toContain(LOGO_COLORS.markLight);
    expect(favicon).toContain(LOGO_COLORS.markDark);
  });

  it("drops only the catchlight at micro sizes, and changes no proportion", () => {
    // §18: the same drawing, not a thickened one. Only the sub-pixel detail
    // that renders as haze is left out.
    const micro = exchangeNotesLogoGeometry({ canvas: 64, ...LOGO_TIERS.micro });
    const large = exchangeNotesLogoGeometry({ canvas: 64, ...LOGO_TIERS.appIcon });

    expect(micro.highlight).toBeNull();

    const proportions = (g: typeof micro) => ({
      stroke: g.strokes.main / g.logo.width,
      ring: g.strokes.ring / g.logo.width,
      eye: g.eye.outerRadius / g.logo.width,
      pupil: g.pupil.r / g.logo.width,
    });

    const a = proportions(micro);
    const b = proportions(large);

    near(a.stroke, b.stroke, 0.001);
    near(a.ring, b.ring, 0.001);
    near(a.eye, b.eye, 0.001);
    near(a.pupil, b.pupil, 0.001);
  });
});
