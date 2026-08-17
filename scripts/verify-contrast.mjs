/*
 * Verifies the ink ramp still clears WCAG AA, in both shells.
 *
 * This exists because the numbers behind those tokens are not visible from the
 * call sites. `text-ink-faint` looks fine in review whatever alpha it resolves
 * to; the only thing that says whether it is 4.76:1 or 2.4:1 is arithmetic
 * nobody runs by hand. So it runs here instead.
 *
 * It also parses the two token files, which is the cheap half and the half
 * that has already earned its place: a merge that keeps both sides of a
 * conflict can leave a comment without its opening `/*`, and every token below
 * the seam silently stops existing. The build catches that one, eventually,
 * with a CssSyntaxError pointing at a line number rather than at the cause.
 * This says which token went missing.
 *
 *   node scripts/verify-contrast.mjs          # summary
 *   node scripts/verify-contrast.mjs --debug  # every pairing, with its ratio
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEBUG = process.argv.includes("--debug");
const AA = 4.5;

/* ---------- colour ---------- */

const hex = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lin = (c) => ((c /= 255), c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};
/* Composite a translucent foreground over an opaque background, the way the
   browser paints `color: rgb(… / a)` — straight sRGB, not premultiplied. */
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
const contrast = (ink, alpha, bg) => ratio(over(hex(ink), alpha, hex(bg)), hex(bg));

/* ---------- parse ---------- */

const read = (f) => readFileSync(join(root, f), "utf8");

function checkSyntax(file, src) {
  const opens = (src.match(/\/\*/g) ?? []).length;
  const closes = (src.match(/\*\//g) ?? []).length;
  if (opens !== closes) {
    return `${file}: unbalanced comments — ${opens} \`/*\` vs ${closes} \`*/\`. ` +
      `A merge that kept both sides of a conflict usually ate a \`/*\`; every ` +
      `token after the seam is now inside a comment.`;
  }
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(src)) return `${file}: conflict markers left in the file.`;
  return null;
}

/* Reads `--name: color-mix(in oklab, var(--x) NN%, transparent)` and returns NN/100.
   color-mix against `transparent` is exactly "this colour at that alpha" — the
   channels are untouched — which is why the compositing above is the right model. */
function alphaOf(src, name, scope) {
  const body = scope ? src.slice(src.indexOf(scope)) : src;
  // `.+?` rather than `[^,]+?`: the ink argument is itself a `var(--x, #fff)`
  // and carries a comma of its own.
  const m = body.match(new RegExp(`(?:^|[^-])--${name}:\\s*color-mix\\(in oklab,.+?(\\d+)%,\\s*transparent\\)`));
  return m ? Number(m[1]) / 100 : null;
}

/* ---------- what sits on what ---------- */

// Standard Mode: black ink on the app's light surfaces.
const LIGHT = {
  white: "#ffffff", "--surface": "#f5f3ed", "--modal-surface": "#fcfcf9",
  "--discover-card": "#fbfaf6", "--discover-page": "#f3f0e8",
  "--control-surface": "#f4f7f2", "--yumi-wash-bottom": "#f6f1e5",
  "--accent-amber-wash": "#fdfaf3",
  "bg-black/[0.05] over white": "#f2f2f2",
  "bg-black/[0.05] over --surface": "#e9e7e1",
};
// Cosmic Mode: the same utilities, with --color-black repointed at #dce9ff.
const DARK = {
  "panel (bg-white)": "#101a30", "--background": "#060a14", "--surface": "#16223c",
  "--accent-amber-wash": "#1a2340", "--discover-accent-soft": "#12243c",
  "--yumi-wash-bottom": "#0d1526",
};
// The black cards. Both `bg-black` and `text-white` invert, so Cosmic pairs
// deep navy ink against a pale panel — a different pairing, not a mirrored one.
//
// These are listed per token rather than as one shared set, because the two
// tiers do not land on the same surfaces. `bg-black/90` is a single element in
// the whole app — the update toast in ServiceWorkerRegister — and it carries
// the soft tier only. Pairing it with the faint tier as well reports a 4.44:1
// failure for something nothing renders. Keep these matched to real call sites;
// an over-broad list here is noise that trains you to ignore the script.
const INVERT_FAINT_LIGHT = { "bg-black": "#000000" };
const INVERT_FAINT_DARK = { "bg-black -> #dce9ff": "#dce9ff" };
const INVERT_SOFT_LIGHT = { "bg-black": "#000000", "bg-black/90 over white": "#1a1a1a" };
const INVERT_SOFT_DARK = { "bg-black -> #dce9ff": "#dce9ff", "bg-black/90 -> #c8d5e9": "#c8d5e9" };

const STANDARD_INK = "#000000";
const COSMIC_INK = "#dce9ff";
const STANDARD_INVERT_INK = "#ffffff";
const COSMIC_INVERT_INK = "#101a30";

/* ---------- run ---------- */

const globals = read("app/globals.css");
const cosmic = read("app/cosmic.css");

const errors = [];
for (const [f, src] of [["app/globals.css", globals], ["app/cosmic.css", cosmic]]) {
  const err = checkSyntax(f, src);
  if (err) errors.push(err);
}
if (errors.length) {
  for (const e of errors) console.error(`FAIL  ${e}`);
  process.exit(1);
}

const COSMIC_SCOPE = 'html[data-interface-mode="yumi-cosmic"]';
const tokens = [
  ["--ink-faint",  alphaOf(globals, "ink-faint"),  STANDARD_INK, LIGHT, "Standard"],
  ["--ink-soft",   alphaOf(globals, "ink-soft"),   STANDARD_INK, LIGHT, "Standard"],
  ["--ink-strong", alphaOf(globals, "ink-strong"), STANDARD_INK, LIGHT, "Standard"],
  // No Cosmic entry for these three by design: they are written against
  // --color-black, which cosmic.css repoints, so they invert on their own.
  ["--ink-faint",  alphaOf(globals, "ink-faint"),  COSMIC_INK, DARK, "Cosmic"],
  ["--ink-soft",   alphaOf(globals, "ink-soft"),   COSMIC_INK, DARK, "Cosmic"],
  ["--ink-strong", alphaOf(globals, "ink-strong"), COSMIC_INK, DARK, "Cosmic"],
  ["--ink-invert-faint", alphaOf(globals, "ink-invert-faint"), STANDARD_INVERT_INK, INVERT_FAINT_LIGHT, "Standard"],
  ["--ink-invert-soft",  alphaOf(globals, "ink-invert-soft"),  STANDARD_INVERT_INK, INVERT_SOFT_LIGHT, "Standard"],
  ["--ink-invert-faint", alphaOf(cosmic, "ink-invert-faint", COSMIC_SCOPE), COSMIC_INVERT_INK, INVERT_FAINT_DARK, "Cosmic"],
  ["--ink-invert-soft",  alphaOf(cosmic, "ink-invert-soft", COSMIC_SCOPE),  COSMIC_INVERT_INK, INVERT_SOFT_DARK, "Cosmic"],
];

const missing = tokens.filter(([, a]) => a === null).map(([n, , , , m]) => `${n} (${m})`);
if (missing.length) {
  console.error(`FAIL  token(s) not found: ${[...new Set(missing)].join(", ")}`);
  console.error("      Defined as color-mix against --color-black / --color-white so both");
  console.error("      shells stay in step — if that changed, update this script too.");
  process.exit(1);
}

let failures = 0, checked = 0;
let mode = null;
for (const [name, alpha, ink, surfaces, m] of tokens) {
  if (DEBUG && m !== mode) { console.log(`\n${m}`); mode = m; }
  for (const [label, bg] of Object.entries(surfaces)) {
    const r = contrast(ink, alpha, bg);
    const ok = r >= AA;
    checked++;
    if (!ok) failures++;
    if (DEBUG || !ok) {
      console[ok ? "log" : "error"](
        `${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  ` +
        `${name.padEnd(19)} @${alpha.toFixed(2)}  on ${label}`
      );
    }
  }
}

console.log(
  failures
    ? `\n${failures} of ${checked} pairings are below AA (${AA}:1).`
    : `\nAll ${checked} ink pairings clear AA (${AA}:1), Standard and Cosmic.`
);
process.exit(failures ? 1 : 0);
