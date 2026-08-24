import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { LanguageCode } from "@/lib/languages";
import type { LexiconResult, LexiconStatus } from "@/lib/lexicon/types";
import { draftVocabularyItem } from "@/lib/offline/vocabulary";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Two layers, never merged

   "You saved this in March" and "here is what it means" are different kinds
   of answer, and only the first one is about the reader. Merging them into a
   single ranked list loses the only piece of information they could not have
   got anywhere else — so the view draws them as two labelled sections and
   this asserts it stays that way.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({
    learningLanguage: "fr",
    nativeLanguage: "en",
  }),
}));

/*
 * usePhonetics returns a lookup function, and the real one reaches the
 * network for IPA. Stubbed to "nothing known yet", which is a state the
 * component already renders every time a word is first seen.
 */
vi.mock("@/hooks/usePhonetics", () => ({
  default: () => () => undefined,
}));

const { default: LexiconResults } = await import(
  "@/components/lexicon/LexiconResults"
);

function saved(
  id: string,
  word: string,
  translation: string,
  language: LanguageCode,
): VocabularyItem {
  return draftVocabularyItem({
    id,
    user_id: "u",
    word,
    translation,
    word_language: language,
    translation_language: language === "en" ? "zh-TW" : "en",
    texts: { [language]: word },
    created_at: "2026-08-23T00:00:00Z",
  } as never);
}

function result(overrides: Partial<LexiconResult> = {}): LexiconResult {
  return {
    query: "tondre",
    kind: "word",
    languages: {
      sourceLanguage: "fr",
      queryLanguage: "fr",
      glossLanguage: "en",
      confidence: 0.9,
      ambiguous: false,
      candidates: ["fr"],
      chosen: false,
    },
    saved: [],
    entry: {
      term: "tondre",
      translation: "to mow",
      partOfSpeech: "verb",
      termExample: "Il faut tondre la pelouse.",
      translationExample: "The lawn needs mowing.",
      confidence: "high",
      category: "actions",
      termLanguage: "fr",
      translationLanguage: "en",
    },
    degraded: false,
    offline: false,
    ...overrides,
  };
}

function harness({
  status = "ready" as LexiconStatus,
  value = result(),
  savedMatches = [] as VocabularyItem[],
  saveState = "idle" as
    | "idle"
    | "saving"
    | "saved"
    | "duplicate"
    | "error",
  duplicate = null as VocabularyItem | null,
}) {
  const search = {
    query: value.query,
    setQuery: vi.fn(),
    status,
    result: { ...value, saved: savedMatches },
    preview: null,
    error: "",
    savedMatches,
    kind: value.kind,
    submit: vi.fn(),
    chooseLanguage: vi.fn(),
    retry: vi.fn(),
    reset: vi.fn(),
    inputMode: "type" as const,
  };

  const save = {
    save: vi.fn(),
    stateFor: () => saveState,
    duplicateFor: () => duplicate,
  };

  return { search, save };
}

describe("the two shells", () => {
  /*
   * Standard Mode draws warm paper and the Command Deck draws instrumentation,
   * and that is the only difference there is allowed to be. Both run the same
   * engine and both render this component, so "the same word gives the same
   * answer in both modes" should be impossible to break — this is the test
   * that says so out loud.
   */
  function textOf(tone: "warm" | "cosmic") {
    const { search, save } = harness({
      savedMatches: [saved("01", "tondre", "割草", "fr")],
    });

    const { container, unmount } = render(
      <LexiconResults
        tone={tone}
        search={search as never}
        save={save as never}
        onOpenSaved={vi.fn()}
      />,
    );

    const text = container.textContent ?? "";
    const listeners = screen.getAllByRole("button", { name: "Listen" }).length;
    const saveButtons = screen.queryAllByRole("button", {
      name: "Save to vocabulary",
    }).length;

    unmount();
    return { text, listeners, saveButtons };
  }

  it("says the same thing in both modes", () => {
    const warm = textOf("warm");
    const cosmic = textOf("cosmic");

    expect(cosmic.text).toBe(warm.text);
  });

  it("offers the same actions in both modes", () => {
    const warm = textOf("warm");
    const cosmic = textOf("cosmic");

    expect(cosmic.listeners).toBe(warm.listeners);
    expect(cosmic.saveButtons).toBe(warm.saveButtons);
    // Saved word, headword, meaning, and both halves of the example.
    expect(warm.listeners).toBe(5);
  });
});

describe("the result view", () => {
  it("shows the reader's own words above the dictionary, each labelled", () => {
    const mine = saved("01", "tondre", "割草", "fr");
    const { search, save } = harness({ savedMatches: [mine] });

    render(
      <LexiconResults
        search={search as never}
        save={save as never}
        onOpenSaved={vi.fn()}
      />,
    );

    const yours = screen.getByText("Your vocabulary");
    const dictionary = screen.getByText("Dictionary");

    expect(yours).toBeInTheDocument();
    expect(dictionary).toBeInTheDocument();

    // Order matters: what you already have comes first.
    expect(
      yours.compareDocumentPosition(dictionary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("names the language the word is in, not the one being studied", () => {
    const { search, save } = harness({});

    render(<LexiconResults search={search as never} save={save as never} />);

    // The badge carries the language as its accessible name, so a flag is
    // never the only thing saying which language this is.
    expect(screen.getAllByLabelText(/French/).length).toBeGreaterThan(0);
  });

  it("says a word is already saved instead of offering to save it again", () => {
    const existing = saved("02", "tondre", "to mow", "fr");
    const { search, save } = harness({
      saveState: "duplicate",
      duplicate: existing,
    });

    render(
      <LexiconResults
        search={search as never}
        save={save as never}
        onOpenSaved={vi.fn()}
      />,
    );

    expect(screen.getByText("Already in your vocabulary")).toBeInTheDocument();
    expect(screen.queryByText("Save to vocabulary")).not.toBeInTheDocument();
  });

  it("offers the choice when the language is genuinely unsettled", () => {
    const { search, save } = harness({
      value: result({
        languages: {
          sourceLanguage: "es",
          queryLanguage: "es",
          glossLanguage: "en",
          confidence: 0.5,
          ambiguous: true,
          candidates: ["es", "it"],
          chosen: false,
        },
      }),
    });

    render(<LexiconResults search={search as never} save={save as never} />);

    expect(screen.getByText("Which language is this?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Spanish/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Italian/ })).toBeInTheDocument();
  });

  it("lets a reader overrule a confident answer", () => {
    // The control used to re-run the lookup in the language it was already
    // in — a request, an identical card, and nothing on screen to show for
    // it. "Change language" has to offer a different language.
    const { search, save } = harness({});

    render(<LexiconResults search={search as never} save={save as never} />);

    fireEvent.click(screen.getByRole("button", { name: "Change language" }));

    expect(screen.getByText("Which language is this?")).toBeInTheDocument();

    // Every language the app teaches, because the reader is looking for the
    // one the detector did not propose.
    for (const name of ["English", "Spanish", "Italian", "Traditional Chinese"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: /Italian/ }));

    expect(search.chooseLanguage).toHaveBeenCalledWith("it");
  });

  it("keeps the shortlist narrow when the app raised the question itself", () => {
    const { search, save } = harness({
      value: result({
        languages: {
          sourceLanguage: "es",
          queryLanguage: "es",
          glossLanguage: "en",
          confidence: 0.5,
          ambiguous: true,
          candidates: ["es", "it"],
          chosen: false,
        },
      }),
    });

    render(<LexiconResults search={search as never} save={save as never} />);

    // Two contenders, not all five: narrowing is the value of having noticed.
    expect(screen.queryByRole("button", { name: /French/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Spanish/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Italian/ })).toBeInTheDocument();
  });

  it("gives every example sentence its own voice", () => {
    // Two sentences in two languages: hearing one is not hearing the other.
    const { search, save } = harness({});

    render(<LexiconResults search={search as never} save={save as never} />);

    const listeners = screen.getAllByRole("button", { name: "Listen" });

    // Headword, meaning, and both halves of the example.
    expect(listeners.length).toBe(4);
  });

  it("will not offer to keep a whole sentence as a card", () => {
    const { search, save } = harness({
      value: result({
        query: "I need to mow the lawn.",
        kind: "sentence",
        entry: {
          term: "I need to mow the lawn.",
          translation: "我需要割草。",
          partOfSpeech: "other",
          termExample: "I need to mow the lawn.",
          translationExample: "我需要割草。",
          confidence: "high",
          category: "actions",
          termLanguage: "en",
          translationLanguage: "zh-TW",
          kind: "sentence",
          highlight: {
            term: "mow the lawn",
            translation: "割草",
            partOfSpeech: "phrase",
          },
        },
      }),
    });

    render(<LexiconResults search={search as never} save={save as never} />);

    expect(screen.getByText("Worth keeping")).toBeInTheDocument();
    expect(screen.getByText("mow the lawn")).toBeInTheDocument();
    // The offer is for the phrase, never for the sentence itself.
    expect(
      screen.getByRole("button", { name: /Save “mow the lawn”/ }),
    ).toBeInTheDocument();
  });
});
