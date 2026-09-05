import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";

/* =========================================================
   Phonetic annotation, per language

     en · es · fr · it   IPA
     zh-TW               zhuyin and pinyin

   A word card used to render only what a caller thought to pass in, and no
   caller passed IPA — so Chinese showed zhuyin and every other language
   showed nothing at all, English included.
   ========================================================= */

vi.mock("@/hooks/i18n/useTranslation", () => ({
  default: () => ({
    t: { vocabulary: { detail: { listenAriaLabel: "Listen to {text}" } } },
  }),
}));

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

type Answer = { ipa?: string; pinyin?: string; zhuyin?: string };

const served = vi.hoisted(() => ({
  calls: [] as Array<{ language: string; texts: string[] }>,
  table: {} as Record<string, Answer>,
}));

function serve() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { texts: string[]; language: string };
      served.calls.push({ language: body.language, texts: body.texts });

      return {
        ok: true,
        json: async () => ({
          phonetics: Object.fromEntries(
            body.texts.map((text) => [
              text,
              served.table[`${body.language}:${text}`] ?? {},
            ]),
          ),
        }),
      };
    }),
  );
}

describe("PronunciationBlock", () => {
  beforeEach(() => {
    served.calls = [];
    vi.resetModules();
  });

  it("annotates Italian in IPA", async () => {
    served.table = { "it:consulenza": { ipa: "/konsuˈlɛntsa/" } };
    serve();

    render(
      <PronunciationBlock
        entries={[{ text: "consulenza", language: "it" }]}
      />,
    );

    expect(await screen.findByText("/konsuˈlɛntsa/")).toBeTruthy();
  });

  it("annotates Chinese with zhuyin and pinyin, from the same lookup", async () => {
    /*
     * These used to be computed here from pinyin-pro, which is what put
     * 640KB of dictionary on the critical path of the home and vocabulary
     * screens — to derive something the very same response already carried
     * and the client was throwing away. They come from the lookup now.
     *
     * Two annotations, not a choice between them: zhuyin and pinyin are both
     * shown, as they always were.
     */
    served.table = {
      "zh-TW:監獄": { zhuyin: "ㄐㄧㄢ ㄩˋ", pinyin: "jiān yù" },
    };
    serve();

    render(<PronunciationBlock entries={[{ text: "監獄", language: "zh-TW" }]} />);

    expect(await screen.findByText("ㄐㄧㄢ ㄩˋ")).toBeTruthy();
    expect(screen.getByText("jiān yù")).toBeTruthy();
  });

  it("asks once for a word that appears many times on screen", async () => {
    /*
     * The batching is why this is affordable at all: a list of word cards is
     * one request per language, not one per card. A distinct word, because
     * the cache is module-level on purpose and outlives a single test — the
     * same property that makes it one request across a whole screen.
     */
    served.table = {
      "zh-TW:圖書館": { zhuyin: "ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ", pinyin: "tú shū guǎn" },
    };
    serve();

    render(
      <>
        <PronunciationBlock entries={[{ text: "圖書館", language: "zh-TW" }]} />
        <PronunciationBlock entries={[{ text: "圖書館", language: "zh-TW" }]} />
        <PronunciationBlock entries={[{ text: "圖書館", language: "zh-TW" }]} />
      </>,
    );

    await screen.findAllByText("ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ");

    expect(served.calls).toHaveLength(1);
    expect(served.calls[0].texts).toEqual(["圖書館"]);
  });

  it("prefers a transcription the caller already has", async () => {
    served.table = { "fr:conseil": { ipa: "/looked-up/" } };
    serve();

    render(
      <PronunciationBlock
        entries={[{ text: "conseil", language: "fr", ipa: "/kɔ̃ˈsɛj/" }]}
      />,
    );

    expect(screen.getByText("/kɔ̃ˈsɛj/")).toBeTruthy();
  });

  it("renders nothing rather than another language's transcription", async () => {
    served.table = {};
    serve();

    const { container } = render(
      <PronunciationBlock entries={[{ text: "gnocchi", language: "it" }]} />,
    );

    await waitFor(() => expect(served.calls.length).toBeGreaterThan(0));
    expect(container.textContent?.trim()).toBe("");
  });
});

describe("usePhonetics batching", () => {
  beforeEach(() => {
    served.calls = [];
    vi.resetModules();
  });

  it("asks once per language however many cards are on screen", async () => {
    served.table = {
      "it:uno": { ipa: "/ˈuno/" },
      "it:due": { ipa: "/ˈdue/" },
      "it:tre": { ipa: "/ˈtre/" },
      "en:one": { ipa: "/wʌn/" },
    };
    serve();

    // Four cards, two languages: the naive shape would be four requests or
    // more, which is what turns scrolling a word list into a flood.
    render(
      <>
        <PronunciationBlock entries={[{ text: "uno", language: "it" }]} />
        <PronunciationBlock entries={[{ text: "due", language: "it" }]} />
        <PronunciationBlock entries={[{ text: "tre", language: "it" }]} />
        <PronunciationBlock entries={[{ text: "one", language: "en" }]} />
      </>,
    );

    await waitFor(() => expect(served.calls.length).toBe(2));

    const italian = served.calls.find((c) => c.language === "it");
    expect(italian?.texts.sort()).toEqual(["due", "tre", "uno"]);
  });

  it("does not ask twice for a word it already has", async () => {
    served.table = { "es:pionero": { ipa: "/pjoˈneɾo/" } };
    serve();

    render(<PronunciationBlock entries={[{ text: "pionero", language: "es" }]} />);
    await waitFor(() => expect(served.calls.length).toBe(1));

    render(<PronunciationBlock entries={[{ text: "pionero", language: "es" }]} />);
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(served.calls.length).toBe(1);
  });
});
