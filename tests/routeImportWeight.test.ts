import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/* =========================================================
   What a tab has to parse before it can show anything

   ── Why this is a test and not a note ──────────────────────────────────

   Tapping a tab in this app felt slow, and the reason was not the tab. It
   was what the tab's module graph dragged in with it. Measured on
   2026-09-24 by walking static imports from each entry point — following
   neither `import type`, which carries no runtime cost, nor `import()`,
   which is a chunk boundary:

     /vocabulary   162 files  1075 KB
     /home         157 files  1115 KB
     /discover      72 files   518 KB
     /profile       79 files   514 KB
     /messages      27 files   210 KB

   Sixteen of those files, and a hundred and twenty kilobytes, were the
   camera — reachable from the word list because the search bar has a camera
   key, and from the home screen because the Cosmic console has the same
   one. A viewfinder that does not exist until somebody taps a button was
   being parsed by the two screens a reader opens most.

   It is loaded on the tap now (see components/lexicon/LexiconImageMenu),
   and this file is what stops it coming back. Not a byte budget, which
   would drift and be silenced: a named thing that must not be on a named
   path, which is a sentence somebody can argue with.
   ========================================================= */

const ROOT = resolve(__dirname, "..");
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

function resolveLocal(specifier: string, fromFile: string) {
  let base: string;
  if (specifier.startsWith("@/")) base = join(ROOT, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return null;

  for (const extension of ["", ...EXTENSIONS]) {
    const candidate = base + extension;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  for (const extension of EXTENSIONS) {
    const candidate = join(base, `index${extension}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Static imports only: `import type` is erased and `import()` is a chunk. */
function staticImports(source: string) {
  const specifiers: string[] = [];
  const named = /(?:^|\n)\s*import\s+(?!type\s)([\s\S]*?)\s*from\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = named.exec(source))) {
    if (/^\s*\{\s*type\s/.test(match[1]) && !/,/.test(match[1])) continue;
    specifiers.push(match[2]);
  }

  const bare = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  while ((match = bare.exec(source))) specifiers.push(match[1]);

  return specifiers;
}

function graphFrom(entry: string) {
  const files = new Set<string>();
  const queue = [join(ROOT, entry)];

  while (queue.length) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);

    for (const specifier of staticImports(readFileSync(file, "utf8"))) {
      const local = resolveLocal(specifier, file);
      if (local && !files.has(local)) queue.push(local);
    }
  }

  return new Set([...files].map((file) => relative(ROOT, file)));
}

const TABS = {
  vocabulary: "app/(protected)/vocabulary/page.tsx",
  home: "app/(protected)/home/page.tsx",
} as const;

describe("what the heaviest tabs drag in with them", () => {
  it.each(Object.entries(TABS))(
    "keeps the camera off %s's first render",
    (_tab, entry) => {
      expect(graphFrom(entry)).not.toContain("components/camera/TargetCamera.tsx");
    },
  );

  /*
   * Eight files of headroom over what these graphs measure today — 150 and
   * 145 — which is deliberately not much. The camera was twelve, so a
   * regression that size fails here rather than being absorbed into a
   * generous budget and noticed a year later.
   *
   * This number is meant to be raised by hand, with a sentence about what
   * was added and why it belongs on a tab's first render. That is the whole
   * point of it: a ceiling nobody ever has to think about is a ceiling that
   * measures nothing.
   *
   * Raised: home 153 → 154 (2026-10-01) for lib/pwa/reloadHolds.ts, a
   * dependency-free file the voice key needs so the app does not reload onto
   * a new build while the microphone is live. It has to be on the path of
   * anything that can listen, and home's search can.
   * Raised home 154 → 156 (2026-10-04) for two dependency-free guards:
   * shared scroll-style ownership and translation compare/merge. Both protect
   * the first-render home/search state; push cleanup remains dynamically loaded.
   * Raised home 156 → 161 and vocabulary 158 → 159 (2026-10-09): the
   * home mode switch adds its visible control and CSS, the Cosmic canvas host
   * and CSS, and a dependency-free timing helper used by the shared mode
   * provider (the eclipse that first carried these is now the veil in
   * HomeModeTransitionScene, the same count). These belong on the initial
   * shell; the WebGL engine must still stay behind import(), which is
   * asserted separately below.
   * Raised home 161 → 165 (2026-10-09): the corner star is part of the
   * Standard home's first frame now rather than of the lazily loaded cookie
   * field, so it is never missing (Chi: "星星icon按鈕應該一直都存在"). Its
   * component and CSS, the request channel to the field, and the field's
   * five-language copy file it takes its label from — none with imports of
   * their own beyond what home already loads.
   * Raised home 165 → 168 (2026-10-11): voice translation. The microphone's
   * level ring and caption (component and CSS), the one fetch that turns a
   * recording into text, and Yumi's reading of a sentence under its
   * translation. All four render from home's own search field, none imports
   * anything home does not already load.
   * Raised home 168 → 171 and vocabulary 159 → 160 (2026-10-11): only
   * Traditional Chinese (Chi: "只能有繁體中文"). Every query is tidied to
   * Traditional where it is normalised (lib/lexicon/normalize.ts), which
   * brings the character table, its word list and the tidy step into home;
   * vocabulary already had the table. Data and pure functions, no imports
   * beyond each other.
   * Raised home 171 → 172 and vocabulary 160 → 161 (2026-10-12): the copy
   * and share of a saved word moved out of the copy key into one file
   * (lib/vocabulary/share.ts), so the share key can say it copied and stop
   * overwriting the clipboard when the share sheet is closed. Both tabs
   * already rendered the copy key; the file imports nothing but a type.
   * Raised home 172 → 173 (2026-10-12): the Yumi shop. Both homes put on
   * what Yumi was bought (lib/shop/wornOutfit.ts) before her first frame, so
   * she never changes clothes in front of the reader. The file imports React
   * and a type; the catalogue, the 3D pieces and the database client all
   * stay behind import().
   * Raised home 173 → 176 (2026-10-12): the shop's key in Home's top corner
   * (Chi: "在主頁的右上角加入一個商城icon") — its component and CSS, and the
   * scroll tuck it shares with the mode switch, moved out of the switch into
   * hooks/home/useTuckOnScroll.ts. None imports anything home does not load.
   * Raised home 176 → 177 and vocabulary 161 → 162 (2026-10-13): energy
   * cookies from saving and reviewing (Chi). Saving a word now tells the
   * cookie-landing card to look (lib/shop/energy.ts: two event names and a
   * constant, no imports). The card itself and the ledger query load with
   * the app's layout, not with either tab.
   * Raised home 177 → 179 (2026-10-15): one Yumi (Chi). Both homes hold her
   * place with components/yumi3d/YumiLoading — a component and its
   * stylesheet, importing nothing else — instead of the old flat mark. The
   * mark is still loaded by home's other Yumi drawings, so the two files
   * are net.
   * Raised home 179 → 180 (2026-10-16): the precision dial (Chi: "可以，
   * debug，合併上線"). components/home/yumi/PrecisionDial and its own
   * stylesheet replace LiquidRingButton, which styled itself from the
   * overlay's CSS — two files for one. It imports React and nothing else.
   * Raised home 180 → 181 (2026-10-19): Yumi hellos (Chi's hello brief: a
   * word "from saved cards or a new lookup"). A looked-up word's "Send with
   * Yumi" hands the word to the editor through lib/hello/draft.ts — the
   * lookup-to-sides conversion and a sessionStorage write, importing only
   * the language table home already loads. The editor, the 3D picture and
   * the share image all stay on their own route.
   * Raised vocabulary 162 → 165 (2026-10-24): each word's status in its own
   * colour with a ring for how far it is from mastered (Chi chose it from
   * the audit). components/vocabulary/MasteryRing, its stylesheet, and
   * lib/vocabulary/mastery.ts, the pure function both the ring and its test
   * read; none imports anything but React's types and a type.
   * Raised home 181 → 183 (2026-10-25): Hangyumi's key beside the shop's
   * (Chi: a minimal line icon next to the shop). components/home/
   * HomeHangyumiKey and components/hangyumi/HangyumiGlyph, an SVG with no
   * imports; the key shares the shop key's stylesheet and scroll tuck. The
   * game, its 3D studio and the word service stay on /hangyumi.
   */
  it.each([
    ["vocabulary", TABS.vocabulary, 165],
    ["home", TABS.home, 183],
  ] as const)(
    "keeps %s's static graph inside its ceiling",
    (_tab, entry, ceiling) => {
      expect(graphFrom(entry).size).toBeLessThan(ceiling);
    },
  );

  it("keeps the 3D engine behind a chunk boundary in both shells", () => {
    for (const entry of Object.values(TABS)) {
      expect(graphFrom(entry)).not.toContain("lib/yumi3d/scene.ts");
    }
  });

  /*
   * The key itself still has to be there. Loading the camera lazily is only
   * an improvement while the button that opens it is drawn exactly when it
   * was before — otherwise this would be a feature removal with a
   * measurement attached.
   */
  it("still reaches the camera key from both", () => {
    for (const entry of Object.values(TABS)) {
      expect(graphFrom(entry)).toContain("components/lexicon/LexiconImageMenu.tsx");
    }
  });
});
