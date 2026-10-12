import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";
import traditionalChinese from "@/lib/i18n/zh-TW";
import type { TranslationLanguage } from "@/lib/i18n/types";
import type { LexiconEntry, LexiconLanguages } from "@/lib/lexicon/types";
import { createNoteContent, noteLabelsFor } from "@/lib/news/noteContent";
import type { VocabularyItem } from "@/lib/types/app";
import type { DailyNewsCard } from "@/lib/types/dailyNews";
import { shareVocabularyItem } from "@/lib/vocabulary/share";

/* =========================================================
   What was left after the share sheet

   A story saved to notes was headed "Vocabulary" / "Source:" / 學習單字
   whatever the reader's pair, a word shared from search said "noun" in
   English, the screen a failed page lands on was English-and-Chinese only,
   and the close buttons on every sheet were "Close" to a screen reader in
   any language. Closing the share sheet on a saved word also copied it over
   whatever the reader had on their clipboard.
   ========================================================= */

const reader = vi.hoisted(() => ({
  language: "english" as TranslationLanguage,
}));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => reader.language,
}));

const HAN = /\p{Script=Han}/u;

beforeEach(() => {
  reader.language = "english";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const story = {
  titles: { es: "Las fábricas se mudan", fr: "Les usines déménagent" },
  summaries: { es: "Un resumen.", fr: "Un résumé." },
  vocabulary: [
    {
      texts: { es: "cadena de suministro", fr: "chaîne d’approvisionnement" },
      partOfSpeech: "noun",
      examples: { es: "La cadena resistió.", fr: "La chaîne a tenu." },
    },
    {
      texts: { es: "mudarse", fr: "déménager" },
      partOfSpeech: "",
      examples: { es: "Se mudan.", fr: "Ils déménagent." },
    },
  ],
  sourceName: "Ejemplo",
  sourceUrl: "https://example.com/story",
} as unknown as DailyNewsCard;

describe("a story saved to notes", () => {
  it("heads each half in that half's own language", async () => {
    const pair = ["es", "fr"] as const;
    const { primary, secondary } = createNoteContent(
      story,
      pair,
      await Promise.all(pair.map((code) => noteLabelsFor(code, english))) as never,
    );

    expect(primary).toContain("Vocabulario\n");
    expect(primary).toContain("Fuente: Ejemplo");
    expect(primary).toContain("• cadena de suministro (sustantivo) — ");
    expect(secondary).toContain("Vocabulaire\n");
    expect(secondary).toContain("• mudarse : déménager");

    for (const half of [primary, secondary]) {
      expect(half).not.toMatch(HAN);
      expect(half).not.toContain("Vocabulary");
      expect(half).not.toContain("Source:");
    }
  });

  it("leaves out a part of speech the story did not give", async () => {
    const pair = ["es", "fr"] as const;
    const { primary } = createNoteContent(
      story,
      pair,
      await Promise.all(pair.map((code) => noteLabelsFor(code, english))) as never,
    );

    expect(primary).toContain("• mudarse — Se mudan.");
    expect(primary).not.toContain("()");
  });

  it("keeps an English–Chinese note as it was", async () => {
    const card = {
      ...story,
      titles: { en: "Factories move", "zh-TW": "工廠搬遷" },
      summaries: { en: "A summary.", "zh-TW": "摘要。" },
      vocabulary: [
        {
          texts: { en: "supply chain", "zh-TW": "供應鏈" },
          partOfSpeech: "noun",
          examples: { en: "It held.", "zh-TW": "撐住了。" },
        },
      ],
      sourceName: "Example",
    } as unknown as DailyNewsCard;
    const pair = ["en", "zh-TW"] as const;

    const { primary, secondary } = createNoteContent(
      card,
      pair,
      await Promise.all(
        pair.map((code) => noteLabelsFor(code, traditionalChinese)),
      ) as never,
    );

    expect(primary).toContain("Vocabulary\n• supply chain (noun) — It held.");
    expect(primary).toContain("Source: Example");
    expect(secondary).toContain("學習單字\n• supply chain：供應鏈");
  });
});

describe("a word shared from search", () => {
  const entry = {
    term: "chair",
    translation: "椅子",
    partOfSpeech: "noun",
    termExample: "Sit on the chair.",
    translationExample: "坐在椅子上。",
  } as LexiconEntry;
  const languages = {
    sourceLanguage: "en",
    glossLanguage: "zh-TW",
  } as LexiconLanguages;

  it("names the part of speech in the app's language", async () => {
    reader.language = "traditional-chinese";
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });

    const { default: useLexiconShare } = await import(
      "@/hooks/lexicon/useLexiconShare"
    );
    const { result } = renderHook(() => useLexiconShare(entry, languages));

    await act(() => result.current.share());

    const text = share.mock.calls[0][0].text as string;
    expect(text).toContain("名詞");
    expect(text).not.toMatch(/\bnoun\b/);
  });
});

describe("sharing a saved word", () => {
  const item = { word: "chair", translation: "椅子" } as VocabularyItem;

  it("leaves the clipboard alone when the reader closes the share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(new DOMException("", "AbortError")),
      clipboard: { writeText },
    });

    await expect(shareVocabularyItem(item)).resolves.toBe("none");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("says it copied when there is no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(shareVocabularyItem(item)).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("chair — 椅子");
  });
});

describe("the screen a failed page lands on", () => {
  it.each([
    ["spanish", "Algo salió mal", "Reintentar"],
    ["french", "Un problème est survenu", "Réessayer"],
    ["italian", "Qualcosa è andato storto", "Riprova"],
    ["english", "Something went wrong", "Try again"],
  ] as const)("is written in %s", async (language, title, retry) => {
    reader.language = language;
    const { default: AppError } = await import("@/app/error");

    const { container } = render(
      <AppError error={new Error("boom")} reset={vi.fn()} />,
    );

    expect(screen.getByRole("heading").textContent).toBe(title);
    expect(screen.getByRole("button", { name: retry })).toBeTruthy();

    // The brand line names every language in its own script on purpose;
    // what the screen says is everything under it.
    const said = [...container.querySelectorAll("h1, h1 ~ *")]
      .map((node) => node.textContent)
      .join(" ");
    expect(said).not.toMatch(HAN);
  });

  it("is written in Traditional Chinese, alone", async () => {
    reader.language = "traditional-chinese";
    const { default: AppError } = await import("@/app/error");

    render(<AppError error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByRole("heading").textContent).toBe("出了一點問題");
    expect(screen.queryByText(/Something went wrong/)).toBeNull();
  });
});

describe("closing a sheet", () => {
  it("is announced in the app's language", async () => {
    reader.language = "french";
    const { default: BottomSheet } = await import(
      "@/components/foundation/overlays/BottomSheet"
    );
    const { default: french } = await import("@/lib/i18n/fr");

    render(
      <BottomSheet open onClose={vi.fn()} title="Titre">
        <p>contenu</p>
      </BottomSheet>,
    );

    expect(
      screen.getAllByRole("button", { name: french.common.close }),
    ).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
