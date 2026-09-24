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
   */
  it.each([
    ["vocabulary", TABS.vocabulary, 158],
    ["home", TABS.home, 153],
  ] as const)(
    "keeps %s's static graph inside its ceiling",
    (_tab, entry, ceiling) => {
      expect(graphFrom(entry).size).toBeLessThan(ceiling);
    },
  );

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
