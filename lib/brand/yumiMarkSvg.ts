/**
 * The Yumi Essential Mark, as SVG text.
 *
 * Everything under public/yumi-brand, app/icon.svg, app/apple-icon.png and
 * app/favicon.ico is written from here by scripts/generate-yumi-brand.mjs —
 * none of it is hand-drawn, and none of it should be hand-edited. The
 * geometry comes from lib/brand/yumiMark.ts; this file only decides how it is
 * spelled out.
 *
 * The React component in components/ui/YumiLogo.tsx draws the same parts as
 * JSX rather than importing these strings, because a component needs
 * animation handles and an accessible name that a static file does not. Both
 * read their coordinates from the same geometry, which is the part that has
 * to agree.
 */

import {
  YUMI_COLORS,
  YUMI_TIERS,
  yumiMarkGeometry,
  type YumiMarkGeometry,
  type YumiMarkOptions,
  type YumiTier,
  /*
   * Written with its extension, unlike every other import in this codebase,
   * and unlike them this one has to survive outside the bundler: the brand
   * generator is a plain Node script, and Node's ESM resolver does not guess
   * extensions. `allowImportingTsExtensions` in tsconfig.json is there for
   * this line.
   */
} from "./yumiMark.ts";

/**
 * The mark's elements, in the order the specification lays out its layers:
 * arc, connector, then the eye with its ring and pupil.
 *
 * `id`s rather than classes because these files are handed to designers as
 * well as to browsers, and an id is what shows up as a layer name when the
 * SVG is opened in a drawing tool.
 */
function markBody(geometry: YumiMarkGeometry, indent = "  ") {
  const { arc, connector, eye, pupil, strokes } = geometry;

  return [
    `${indent}<g id="yumi-logo" fill="none" stroke="currentColor" stroke-width="${strokes.main}">`,
    /* Round terminals, per the mark's one rule about how a stroke may end. */
    `${indent}  <path id="yumi-arc" d="${arc.d}" stroke-linecap="round"/>`,
    /* Butt caps: both ends finish inside another shape's ink. See the note in
       lib/brand/yumiMark.ts — this is the join, not an inconsistency. */
    `${indent}  <path id="yumi-connector" d="${connector.d}"/>`,
    `${indent}  <g id="yumi-eye">`,
    `${indent}    <circle id="yumi-eye-outer-ring" cx="${eye.cx}" cy="${eye.cy}" r="${eye.ringRadius}" stroke-width="${strokes.ring}"/>`,
    /* The catchlight is a hole in this path rather than a shape of its own,
       so the mark stays one colour and the highlight cannot leave the pupil.
       At micro sizes the path is the pupil alone. */
    `${indent}    <path id="yumi-eye-pupil" d="${pupil.d}" fill="currentColor" fill-rule="evenodd" stroke="none"/>`,
    `${indent}  </g>`,
    `${indent}</g>`,
  ].join("\n");
}

function svgOpen(size: number, extra = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"${extra}>`;
}

export type LogoSvgOptions = {
  tier?: YumiTier;
  /** Dark surfaces take the optically corrected weight. */
  weight?: YumiMarkOptions["weight"];
  /**
   * What the mark is painted in. `currentColor` is the default and the point:
   * a page sets `color: var(--yumi-mark)` and the logo follows the theme with
   * no second file and no filter: invert().
   */
  color?: string;
  size?: number;
};

/** The logo on its own — no canvas, no tile, transparent everywhere else. */
export function renderYumiLogoSvg({
  tier = "large",
  weight = "regular",
  color = "currentColor",
  size = 512,
}: LogoSvgOptions = {}) {
  const geometry = yumiMarkGeometry({ canvas: size, weight, ...YUMI_TIERS[tier] });
  const body =
    color === "currentColor"
      ? markBody(geometry)
      : markBody(geometry).replaceAll("currentColor", color);

  return `${svgOpen(size)}
  <title>Exchange Notes</title>
${body}
</svg>
`;
}

export type IconSvgOptions = {
  mode: "light" | "dark";
  size?: number;
  /**
   * Maskable icons are cropped by the OS to whatever shape it likes, so the
   * canvas has to reach every edge and stay opaque. Ours already does — the
   * production artwork is a plain square with no corner mask of its own, per
   * the rule that the OS owns the corner — so this changes nothing about the
   * drawing and only marks the intent.
   */
  maskable?: boolean;
};

/**
 * The app icon: square artwork, edge to edge, no rounded corners baked in.
 *
 * The corner mask belongs to the OS. Anything we round ourselves shows up as
 * a lighter seam inside iOS's squircle, and as visible transparent corners
 * wherever the platform crops to a circle instead.
 */
export function renderYumiIconSvg({ mode, size = 1024 }: IconSvgOptions) {
  const canvas = mode === "light" ? YUMI_COLORS.canvasLight : YUMI_COLORS.canvasDark;
  const mark = mode === "light" ? YUMI_COLORS.markLight : YUMI_COLORS.markDark;
  const geometry = yumiMarkGeometry({
    canvas: size,
    weight: mode === "dark" ? "dark" : "regular",
    ...YUMI_TIERS.large,
  });

  return `${svgOpen(size)}
  <title>Exchange Notes</title>
  <rect width="${size}" height="${size}" fill="${canvas}"/>
${markBody(geometry).replaceAll("currentColor", mark)}
</svg>
`;
}

/**
 * The favicon: the micro tier, on nothing.
 *
 * A tab strip is not a canvas we control — it is light in one browser, dark
 * in the next, and changes under the user's hands. So the mark is drawn on
 * transparency and swaps ink with the platform's colour scheme. This is the
 * one place a media query belongs inside the artwork: an SVG favicon is
 * loaded outside any page's CSS, so `currentColor` has nothing to inherit
 * from and a token cannot reach it.
 */
export function renderYumiFaviconSvg(size = 512) {
  const geometry = yumiMarkGeometry({ canvas: size, ...YUMI_TIERS.micro });

  return `${svgOpen(size)}
  <title>Exchange Notes</title>
  <style>
    :root { color: ${YUMI_COLORS.markLight}; }
    @media (prefers-color-scheme: dark) { :root { color: ${YUMI_COLORS.markDark}; } }
  </style>
${markBody(geometry)}
</svg>
`;
}
