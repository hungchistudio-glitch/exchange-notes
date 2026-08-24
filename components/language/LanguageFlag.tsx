import type { ReactElement } from "react";

import type { LanguageMetadata } from "@/lib/languages";

/* =========================================================
   Flags the app draws itself

   Emoji flags were the obvious answer and are not a usable one: Windows
   ships no flag glyphs at all and renders 🇫🇷 as the letters "FR" in a box,
   several Android builds render them at a different optical weight from the
   surrounding text, and every platform sizes them slightly differently — so
   a badge that has to line up inside a 20px slot on every card would line up
   on none of them.

   These are drawn instead: same size, same corner radius, same hairline, on
   every device. They are schematic on purpose — at 20 by 14 a faithful US
   flag is a grey smudge, so it gets the stripes and a suggestion of stars,
   which is what the eye reads at this size anyway.

   Keyed by region rather than by language, and the region comes from
   lib/languages.ts. A sixth language means a row there and a glyph here.
   ========================================================= */

type Region = LanguageMetadata["representativeRegion"];

const W = 20;
const H = 14;

function UnitedStates() {
  // Thirteen stripes, seven of them red.
  const stripe = H / 13;

  return (
    <>
      <rect width={W} height={H} fill="#F7F7F7" />
      {[0, 2, 4, 6, 8, 10, 12].map((row) => (
        <rect
          key={row}
          y={row * stripe}
          width={W}
          height={stripe}
          fill="#C8102E"
        />
      ))}
      <rect width={8.4} height={stripe * 7} fill="#1B3A73" />
      {[1.4, 3.5, 5.6, 7].map((x) =>
        [1.3, 3.2, 5.1].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={0.42} fill="#FFFFFF" />
        )),
      )}
    </>
  );
}

function Taiwan() {
  return (
    <>
      <rect width={W} height={H} fill="#D42B26" />
      <rect width={10} height={7} fill="#122A6B" />
      {/* The twelve rays, as one starred disc rather than twelve wedges. */}
      <circle cx={5} cy={3.5} r={2.5} fill="#FFFFFF" />
      <circle cx={5} cy={3.5} r={1.75} fill="#122A6B" />
      <circle cx={5} cy={3.5} r={1.25} fill="#FFFFFF" />
    </>
  );
}

function Spain() {
  return (
    <>
      <rect width={W} height={H} fill="#C60B1E" />
      <rect y={3.5} width={W} height={7} fill="#FFC400" />
    </>
  );
}

function France() {
  return (
    <>
      <rect width={W} height={H} fill="#F7F7F7" />
      <rect width={W / 3} height={H} fill="#1B3A73" />
      <rect x={(W / 3) * 2} width={W / 3} height={H} fill="#C8102E" />
    </>
  );
}

function Italy() {
  return (
    <>
      <rect width={W} height={H} fill="#F7F7F7" />
      <rect width={W / 3} height={H} fill="#008C45" />
      <rect x={(W / 3) * 2} width={W / 3} height={H} fill="#CD212A" />
    </>
  );
}

const GLYPHS: Record<Region, () => ReactElement> = {
  US: UnitedStates,
  TW: Taiwan,
  ES: Spain,
  FR: France,
  IT: Italy,
};

/**
 * The flag mark alone, with no label and no accessible name.
 *
 * Decorative by construction: it is always drawn inside something that names
 * the language in text — LanguageOriginBadge, or a picker row. A flag that
 * announced itself would make a screen reader say the country twice, and say
 * a country where the answer is a language.
 */
export default function LanguageFlag({
  region,
  className = "",
}: {
  region: Region;
  className?: string;
}) {
  const Glyph = GLYPHS[region];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`flag-clip-${region}`}>
          <rect width={W} height={H} rx={2.5} ry={2.5} />
        </clipPath>
      </defs>

      <g clipPath={`url(#flag-clip-${region})`}>
        <Glyph />
      </g>

      {/* Keeps the white-heavy flags from dissolving into a white card. */}
      <rect
        x={0.25}
        y={0.25}
        width={W - 0.5}
        height={H - 0.5}
        rx={2.35}
        ry={2.35}
        fill="none"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth={0.5}
      />
    </svg>
  );
}
