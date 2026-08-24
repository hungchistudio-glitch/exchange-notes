import ExchangeNotesLogo from "@/components/brand/ExchangeNotesLogo";
import {
  APP_ICON_WIDTH_RATIO,
  CONSTRUCTION,
  LOGO_COLORS,
  LOGO_TIERS,
  exchangeNotesLogoGeometry,
} from "@/lib/brand/exchangeNotesLogo";

/*
 * The brand comparison screen the specification asks for in §26.
 *
 * Light and dark side by side at 64, 128, 256 and 512, so the one thing that
 * must be true of this mark can be checked by looking rather than by trusting
 * a test: dark mode is the same drawing under inverted contrast, and nothing
 * about it grows, shifts or thickens.
 *
 * A development surface, not a product one — it is not linked from anywhere,
 * and it renders nothing an account owns. It sits beside /launch-review,
 * which exists for the same reason.
 */

export const metadata = {
  title: "Brand review — Exchange Notes",
  robots: { index: false, follow: false },
};

const SIZES = [64, 128, 256, 512] as const;

const master = exchangeNotesLogoGeometry({ canvas: 1024, ...LOGO_TIERS.appIcon });

/** §25's acceptance targets, checked here as well as in the test suite. */
const MEASUREMENTS: Array<[string, string, string]> = [
  ["Mark width", `${master.logo.width}`, "446 ± 3"],
  ["Mark height", `${master.logo.height}`, "490 ± 3"],
  ["Canvas share", `${(APP_ICON_WIDTH_RATIO * 100).toFixed(2)}%`, "43.5–43.7%"],
  [
    "Visual centre",
    `${master.logo.x + master.logo.width / 2}, ${
      master.logo.y + master.logo.height / 2
    }`,
    "512, 512",
  ],
  ["Main stroke", `${master.strokes.main}`, "~54"],
  ["Eye ring", `${master.strokes.ring}`, "~21"],
  ["Eye centre", `${master.eye.cx}, ${master.eye.cy}`, "~616, ~513"],
  ["Eye diameter", `${master.eye.outerRadius * 2}`, "~238"],
  ["Pupil diameter", `${master.pupil.r * 2}`, "~100"],
  ["Highlight diameter", `${(master.highlight?.r ?? 0) * 2}`, "~27"],
  [
    "Highlight offset",
    `${(master.highlight?.cx ?? 0) - master.pupil.cx}, ${
      (master.highlight?.cy ?? 0) - master.pupil.cy
    }`,
    "+15, −14",
  ],
  ["Arc radius", `${master.arc.r}`, "215–220"],
  ["Opening half-angle", `${CONSTRUCTION.openingHalfAngle}°`, "read from the reference"],
];

function Panel({
  theme,
  label,
  caption,
}: {
  theme: "light" | "dark";
  label: string;
  caption: string;
}) {
  const dark = theme === "dark";

  return (
    <section
      className="flex-1 rounded-[28px] p-8"
      style={{
        background: dark ? "#1c1c1f" : "#f4f4f5",
        color: dark ? "#ffffff" : "#000000",
      }}
    >
      <div className="flex flex-wrap items-end justify-center gap-8">
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-3">
            {/*
              The app-icon variant, which is how a person meets this mark:
              on its canvas, with the ~12% preview rounding. Rendered at exact
              integer sizes so nothing lands on a half pixel.
            */}
            <ExchangeNotesLogo variant="app-icon" theme={theme} size={size} />
            <span
              className="text-[11px] font-medium tabular-nums"
              style={{ color: dark ? "#8a8a92" : "#71717a" }}
            >
              {size}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-center gap-10">
        {/* The mark alone, taking its ink from the surrounding colour. */}
        <ExchangeNotesLogo
          variant="mark"
          size={96}
          decorative={false}
          className="shrink-0"
        />
        <ExchangeNotesLogo variant="mark" size={40} />
        <ExchangeNotesLogo variant="mark" size={24} />
        <ExchangeNotesLogo variant="mark" size={16} />
      </div>

      <p className="mt-8 text-center text-[15px] font-semibold">{label}</p>
      <p
        className="mt-1 text-center text-[13px]"
        style={{ color: dark ? "#8a8a92" : "#71717a" }}
      >
        {caption}
      </p>
    </section>
  );
}

export default function BrandReviewPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-[26px] font-semibold tracking-[-0.03em]">
        Exchange Notes logo
      </h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-6 text-ink-soft">
        One geometry, two colour pairs. Everything below is drawn from
        lib/brand/exchangeNotesLogo.ts — the same numbers the app icons,
        favicon and PWA assets are generated from.
      </p>

      <div className="mt-8 flex flex-col gap-5 sm:flex-row">
        <Panel
          theme="light"
          label="Light Mode"
          caption={`Pure White Canvas ${LOGO_COLORS.canvasLight} · Deep Obsidian Mark ${LOGO_COLORS.markLight}`}
        />
        <Panel
          theme="dark"
          label="Dark Mode"
          caption={`Jet Obsidian Canvas ${LOGO_COLORS.canvasDark} · Pure White Mark ${LOGO_COLORS.markDark}`}
        />
      </div>

      <h2 className="mt-12 text-[18px] font-semibold tracking-[-0.02em]">
        Master measurements
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Computed at the 1024 master, against the specification&rsquo;s
        acceptance targets. tests/exchangeNotesLogo.test.ts asserts the same
        values.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-black/10 text-ink-faint">
              <th className="py-2 pr-4 font-medium">Measurement</th>
              <th className="py-2 pr-4 font-medium">Drawn</th>
              <th className="py-2 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {MEASUREMENTS.map(([name, drawn, target]) => (
              <tr key={name} className="border-b border-black/[0.06]">
                <td className="py-2 pr-4">{name}</td>
                <td className="py-2 pr-4 font-semibold">{drawn}</td>
                <td className="py-2 text-ink-soft">{target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
