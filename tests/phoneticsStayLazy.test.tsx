import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NewsCardMessage from "@/components/messages/NewsCardMessage";
import { toPinyin } from "@/lib/pinyin";

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({
    learningLanguage: "zh-TW",
    supportLanguage: "en",
    pair: ["en", "zh-TW"] as const,
  }),
}));

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

/* =========================================================
   The dictionary must not creep back into the first payload

   pinyin-pro is ~304KB. It reached both the home screen and the
   conversation room through ordinary-looking static imports:

     StandardHome -> UniversalSearchField -> useLexiconShare -> lib/pinyin
     ConversationRoom -> NewsCardMessage -> lib/pronunciation

   Neither screen reads a romanisation while it is drawing, so both now
   reach the dictionary through `import(...)` instead. Nothing about that
   is visible in review: adding `import { toPinyin } from "@/lib/pinyin"`
   back to a client module compiles, passes every behavioural test, and
   silently puts 304KB back on the critical path of a phone.

   So the boundary is asserted directly. These read source rather than
   behaviour on purpose — the property being protected is *when* the bytes
   arrive, which no rendering test can see.
   ========================================================= */

const root = join(import.meta.dirname, "..");

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

/** `import type` is erased before it reaches a bundler; a value import is not. */
function staticValueImports(code: string, specifier: string): boolean {
  const pattern = new RegExp(
    String.raw`^import\s+(?!type\s)[^;]*?from\s+["']${specifier}["']`,
    "m",
  );

  return pattern.test(code);
}

describe("the phonetics dictionary stays off the first payload", () => {
  it("lib/pinyin reaches pinyin-pro only through import()", () => {
    const code = source("lib/pinyin.ts");

    expect(staticValueImports(code, "pinyin-pro")).toBe(false);
    expect(code).toContain('import("pinyin-pro")');
  });

  it("the share hook does not drag the dictionary onto the home screen", () => {
    /* useLexiconShare may import lib/pinyin — that module is now lazy — but
       must never reach pinyin-pro itself, which would defeat the split. */
    const code = source("hooks/lexicon/useLexiconShare.ts");

    expect(staticValueImports(code, "pinyin-pro")).toBe(false);
    expect(staticValueImports(code, "@/lib/pronunciation")).toBe(false);
  });

  it("the news card reaches lib/pronunciation only through the lazy hook", () => {
    const code = source("components/messages/NewsCardMessage.tsx");

    expect(staticValueImports(code, "@/lib/pronunciation")).toBe(false);
    expect(staticValueImports(code, "pinyin-pro")).toBe(false);
    expect(code).toContain("useLocalPhonetics");
  });

  it("the lazy hook holds the only import() of lib/pronunciation it needs", () => {
    const code = source("hooks/pronunciation/useLocalPhonetics.ts");

    expect(staticValueImports(code, "@/lib/pronunciation")).toBe(false);
    expect(code).toContain('import("@/lib/pronunciation")');
  });
});

describe("toPinyin still answers correctly once loaded", () => {
  it("romanises Chinese with tone marks", async () => {
    await expect(toPinyin("你好")).resolves.toBe("nǐ hǎo");
  });

  it("returns null for text with no Chinese, without loading anything", async () => {
    await expect(toPinyin("hello")).resolves.toBeNull();
  });
});

describe("the news card still annotates, just a moment later", () => {
  /*
   * The half of the split no source-level assertion can see. If the dynamic
   * import never resolved — a rejected promise, a hook that dropped the
   * result — the card would simply render without its annotation row, every
   * existing test would still pass, and the feature would be quietly gone.
   */
  const card = {
    id: "https://example.com/a",
    category: "Society",
    titles: { en: "Prisons", "zh-TW": "監獄" },
    summaries: {},
    captions: {},
    sourceName: "The Guardian",
    sourceUrl: "https://example.com/a",
    publishedAt: "2026-08-22T00:00:00Z",
    imageUrl: null,
    vocabulary: [],
  };

  it("has no annotation on the first paint", () => {
    const { queryByText } = render(
      <NewsCardMessage card={card as never} createdAt="2026-08-22T00:00:00Z" />,
    );

    /* The dictionary cannot have arrived yet; the row must be absent, not
       blank — a blank row would push the layout around for nothing. */
    expect(queryByText(/jiān yù/)).toBeNull();
  });

  it("fills the annotation in once the dictionary lands", async () => {
    const { findByText } = render(
      <NewsCardMessage card={card as never} createdAt="2026-08-22T00:00:00Z" />,
    );

    /*
     * One space, not the two the card joins with: Testing Library collapses
     * runs of whitespace before matching. Both systems in one assertion,
     * because the zhuyin is derived from the pinyin and a card showing only
     * one of them is a half-loaded dictionary, not a passing test.
     */
    await expect(findByText("jiān yù ㄐㄧㄢ ㄩˋ")).resolves.toBeInTheDocument();
  });
});
