/**
 * The Exchange Notes logo, as SVG text.
 *
 * Everything under public/brand, app/icon.svg, app/apple-icon.png and
 * app/favicon.ico is written from here by scripts/generate-brand.mjs — none of
 * it is hand-drawn, and none of it should be hand-edited. The geometry comes
 * from lib/brand/exchangeNotesLogo.ts; this file only decides how it is
 * spelled out.
 *
 * The React component in components/brand/ExchangeNotesLogo.tsx draws the
 * same parts as JSX rather than importing these strings, because a component
 * needs an accessible name and a theme that a static file does not. Both read
 * their coordinates from the same geometry, which is the part that has to
 * agree — §28: one geometry, different presentation colours, never two SVGs.
 */

import {
  LOGO_COLORS,
  LOGO_TIERS,
  exchangeNotesLogoGeometry,
  type ExchangeNotesLogoGeometry,
  type LogoTier,
  /*
   * Written with its extension, unlike every other import in this codebase,
   * and unlike them this one has to survive outside the bundler: the brand
   * generator is a plain Node script, and Node's ESM resolver does not guess
   * extensions. `allowImportingTsExtensions` in tsconfig.json is there for
   * this line.
   */
} from "./exchangeNotesLogo.ts";

/**
 * The mark's elements, in the order the specification lays out its layers:
 * the C arc, the bridge, then the eye with its ring, pupil and catchlight.
 *
 * `id`s rather than classes because these files are handed to designers as
 * well as to browsers, and an id is what shows up as a layer name when the
 * SVG is opened in a drawing tool. §15 asks for exactly these layers to stay
 * conceptually separate.
 */
function markBody(geometry: ExchangeNotesLogoGeometry, indent = "  ") {
  const { arc, bridge, eye, pupil, strokes } = geometry;

  return [
    `${indent}<g id="exchange-notes-mark" fill="none" stroke="currentColor" stroke-width="${strokes.main}" stroke-linejoin="round">`,
    /* Round terminals, per §5 — the mark's one rule about how a stroke ends. */
    `${indent}  <path id="mark-arc" d="${arc.d}" stroke-linecap="round"/>`,
    /* Butt caps: both ends finish inside another shape's ink. See the note in
       lib/brand/exchangeNotesLogo.ts — this is the join, not an
       inconsistency, and it is what §6 means by no visible gap. */
    `${indent}  <path id="mark-bridge" d="${bridge.d}"/>`,
    `${indent}  <g id="mark-eye">`,
    `${indent}    <circle id="mark-eye-ring" cx="${eye.cx}" cy="${eye.cy}" r="${eye.ringRadius}" stroke-width="${strokes.ring}"/>`,
    /* The catchlight is a hole in this path rather than a shape of its own,
       so the mark stays one colour and the highlight inverts with the pupil
       for free. At micro sizes the path is the pupil alone. */
    `${indent}    <path id="mark-eye-pupil" d="${pupil.d}" fill="currentColor" fill-rule="evenodd" stroke="none"/>`,
    `${indent}  </g>`,
    `${indent}</g>`,
  ].join("\n");
}

function svgOpen(size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
}

export type LogoSvgOptions = {
  tier?: LogoTier;
  /**
   * What the mark is painted in. `currentColor` is the default and the point:
   * a page sets `color: var(--yumi-mark)` and the logo follows the theme with
   * no second file and no filter: invert().
   */
  color?: string;
  size?: number;
};

/** The logo on its own — no canvas, no tile, transparent everywhere else. */
export function renderLogoSvg({
  tier = "appIcon",
  color = "currentColor",
  size = 1024,
}: LogoSvgOptions = {}) {
  const geometry = exchangeNotesLogoGeometry({ canvas: size, ...LOGO_TIERS[tier] });
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

export type AppIconSvgOptions = {
  mode: "light" | "dark";
  size?: number;
};

/**
 * The app icon: square artwork, edge to edge, no rounded corners baked in.
 *
 * §16 is explicit that the corner mask belongs to the OS. Anything we round
 * ourselves shows up as a lighter seam inside iOS's squircle, and as visible
 * transparent corners wherever the platform crops to a circle instead. The
 * 12% radius is applied only where Exchange Notes itself draws a preview —
 * see the app-icon variant of the React component.
 *
 * Light and dark differ in exactly two values, per §24: the canvas colour and
 * the mark colour. Same geometry, same strokes, same position.
 */
export function renderAppIconSvg({ mode, size = 1024 }: AppIconSvgOptions) {
  const canvas =
    mode === "light" ? LOGO_COLORS.canvasLight : LOGO_COLORS.canvasDark;
  const mark = mode === "light" ? LOGO_COLORS.markLight : LOGO_COLORS.markDark;

  const geometry = exchangeNotesLogoGeometry({
    canvas: size,
    ...LOGO_TIERS.appIcon,
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
 * transparency and swaps ink with the platform's colour scheme, which is
 * §21's theme-aware browser icon done the one way that is actually reliable.
 * This is also the one place a media query belongs inside the artwork: an SVG
 * favicon is loaded outside any page's CSS, so `currentColor` has nothing to
 * inherit from and a token cannot reach it.
 */
export function renderFaviconSvg(size = 512) {
  const geometry = exchangeNotesLogoGeometry({
    canvas: size,
    ...LOGO_TIERS.micro,
  });

  return `${svgOpen(size)}
  <title>Exchange Notes</title>
  <style>
    :root { color: ${LOGO_COLORS.markLight}; }
    @media (prefers-color-scheme: dark) { :root { color: ${LOGO_COLORS.markDark}; } }
  </style>
${markBody(geometry)}
</svg>
`;
}
