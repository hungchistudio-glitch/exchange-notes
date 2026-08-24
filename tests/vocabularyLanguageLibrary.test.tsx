import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   A library that crosses languages and eras

   The acceptance scenario, end to end: five words saved under five
   different pairings, read by somebody who has since moved to Italian with a
   Chinese gloss. Every card keeps its own language, its own badge and its
   own voice, and the filter can show one language at a time.
   ========================================================= */

const preferences = vi.hoisted(() => ({ interfaceLanguage: "english" }));
const profile = vi.hoisted(() => ({ learning: "it", native: "zh-TW" }));

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => preferences.interfaceLanguage,
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({
    learningLanguage: profile.learning,
    nativeLanguage: profile.native,
  }),
}));

const spoken = vi.hoisted(() => ({ calls: [] as Array<[string, string]> }));

vi.mock("@/lib/speech", () => ({
  speak: (text: string, language: string) => {
    spoken.calls.push([text, language]);
  },
}));

const { default: useVisibleVocabularyItems } = await import(
  "@/hooks/useVisibleVocabularyItems"
);
const { default: VocabularyCompactHeader } = await import(
  "@/components/vocabulary/card/VocabularyCompactHeader"
);
const { default: VocabularyDetailSheet } = await import(
  "@/components/vocabulary/VocabularyDetailSheet"
);

function word(
  id: string,
  term: string,
  termLanguage: LanguageCode,
  translation: string,
  translationLanguage: LanguageCode,
): VocabularyItem {
  return {
    id,
    user_id: "reader",
    word: term,
    translation,
    language: termLanguage,
    word_language: termLanguage,
    translation_language: translationLanguage,
    texts: { [termLanguage]: term, [translationLanguage]: translation },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: "medium",
    status: "new",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  } as VocabularyItem;
}

/*
 * The library from the brief. Note that not one of these was saved under the
 * pairing the reader is using now.
 */
const library: VocabularyItem[] = [
  word("1", "mow", "en", "修剪", "zh-TW"),
  word("2", "tondre", "fr", "mow", "en"),
  word("3", "cortar", "es", "to cut", "en"),
  word("4", "tagliare", "it", "to cut", "en"),
  word("5", "修剪", "zh-TW", "trim", "en"),
];

function visible(languages: readonly LanguageCode[], query = "") {
  let result: VocabularyItem[] = [];

  function Probe() {
    result = useVisibleVocabularyItems({
      items: library,
      query,
      quickFilter: "all",
      languages,
      sortMode: "new",
      rankedIds: [],
    });
    return null;
  }

  render(<Probe />);
  return result.map((item) => item.word);
}

describe("the language filter", () => {
  it("shows everything when no language is chosen", () => {
    expect(visible([]).sort()).toEqual(
      ["mow", "tondre", "cortar", "tagliare", "修剪"].sort(),
    );
  });

  it("shows one language at a time", () => {
    expect(visible(["fr"])).toEqual(["tondre"]);
    expect(visible(["it"])).toEqual(["tagliare"]);
    expect(visible(["zh-TW"])).toEqual(["修剪"]);
  });

  it("filters on the row's own language, not on the reader's", () => {
    // The reader is studying Italian. "tagliare" is the only Italian row,
    // even though every other row could be shown to an Italian learner.
    expect(visible(["it"])).toHaveLength(1);
  });

  it("takes several languages at once", () => {
    // Single-select in the sheet today; the state and the filter have never
    // been limited to one.
    expect(visible(["fr", "it"]).sort()).toEqual(["tagliare", "tondre"]);
  });

  it("combines with search rather than replacing it", () => {
    // "mow" is the headword of one row and the gloss of another.
    expect(visible([], "mow").sort()).toEqual(["mow", "tondre"]);
    expect(visible(["fr"], "mow")).toEqual(["tondre"]);
  });

  it("searches every language the library holds, not just the current pair", () => {
    expect(visible([], "修剪").sort()).toEqual(["mow", "修剪"]);
    expect(visible([], "cortar")).toEqual(["cortar"]);
  });
});

/* =========================================================
   What each card says about itself
   ========================================================= */

describe("the language origin badge", () => {
  const expected: Array<[string, string]> = [
    ["mow", "English"],
    ["tondre", "French"],
    ["cortar", "Spanish"],
    ["tagliare", "Italian"],
    ["修剪", "Traditional Chinese"],
  ];

  for (const [term, language] of expected) {
    it(`labels "${term}" as ${language}`, () => {
      const item = library.find((row) => row.word === term)!;

      render(<VocabularyCompactHeader item={item} />);

      // The accessible name says the language outright, so nothing depends
      // on reading a flag — or on seeing one.
      expect(
        screen.getByLabelText(`Vocabulary language: ${language}`),
      ).toBeInTheDocument();
    });
  }

  it("keeps the headword in its own language while the reader studies another", () => {
    profile.learning = "it";
    profile.native = "zh-TW";

    const { container } = render(
      <VocabularyCompactHeader item={library[1]} />,
    );

    expect(container.textContent).toContain("tondre");
  });
});

/* =========================================================
   And what each card sounds like
   ========================================================= */

describe("pronunciation follows the card, not the settings", () => {
  const expected: Array<[string, string]> = [
    ["mow", "en-US"],
    ["tondre", "fr-FR"],
    ["cortar", "es-ES"],
    ["tagliare", "it-IT"],
    ["修剪", "zh-TW"],
  ];

  for (const [term, speechTag] of expected) {
    it(`speaks "${term}" with the ${speechTag} voice`, async () => {
      spoken.calls = [];

      // The reader is studying Italian with a Chinese gloss. None of that
      // may reach the voice a French word is read in.
      profile.learning = "it";
      profile.native = "zh-TW";

      const item = library.find((row) => row.word === term)!;

      render(
        <VocabularyDetailSheet
          item={item}
          open
          updating={false}
          onClose={() => {}}
          onChangeStatus={() => {}}
          onSendToPartner={() => {}}
          onShare={() => {}}
          onDelete={() => {}}
          onOpenCollections={() => {}}
          onEdit={() => {}}
          onChangeLanguage={() => {}}
        />,
      );

      const listen = screen.getAllByLabelText(`Listen: ${term}`);
      await userEvent.click(listen[0]);

      expect(spoken.calls).toContainEqual([term, speechTag]);
    });
  }
});
