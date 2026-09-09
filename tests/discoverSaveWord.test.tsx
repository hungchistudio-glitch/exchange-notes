import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";
import type { VocabularyItem as LibraryItem } from "@/lib/types/app";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

/* =========================================================
   Saving a recommended word, and being told when it cannot be

   Reported as "the first story's three words won't save". They would not,
   and the app was right to refuse: all three were already in the library.
   What was wrong is that it refused in silence —

     } catch (error) {
       console.error("Failed to save vocabulary word:", error);
     }

   — so the button did not move, no message appeared, and a feature working
   exactly as designed looked broken. The sign-in path was worse: a bare
   `return` with no message at all.

   It is not a rare corner. Seventeen percent of a week's recommended words
   were already in this reader's library, and that share only grows as the
   library does.

   The fix is mostly not the error handling. A word the reader already has
   should never offer a button that cannot work: it shows as theirs when the
   sheet opens.
   ========================================================= */

const library: LibraryItem[] = [];
const saveCalls: Array<{ term: string }> = [];
let saveBehaviour: "ok" | "duplicate" | "explode" = "ok";
let signedIn = true;

vi.mock("@/hooks/useVocabulary", () => ({
  default: () => ({ items: library }),
}));

vi.mock("@/lib/vocabulary/repository", () => ({
  getCurrentUser: async () => ({ user: signedIn ? { id: "reader" } : null }),
}));

vi.mock("@/lib/vocabulary/createEntry", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/vocabulary/createEntry")
  >();

  return {
    ...actual,
    createVocabularyEntry: async (input: { term: string }) => {
      saveCalls.push({ term: input.term });

      if (saveBehaviour === "duplicate") {
        throw new actual.DuplicateVocabularyError({ id: "x" } as never);
      }
      if (saveBehaviour === "explode") throw new Error("network is gone");

      return { item: { id: "new" }, identity: {} };
    },
  };
});

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({
    learningLanguage: "en",
    supportLanguage: "zh-TW",
    pair: ["en", "zh-TW"],
  }),
}));

const VocabularyDrawer = (await import("@/components/discover/VocabularyDrawer"))
  .default;

const copy = english.discover;

function word(text: string) {
  return {
    texts: { en: text, "zh-TW": "字" },
    examples: { en: `A sentence with ${text}.`, "zh-TW": "一個句子。" },
    partOfSpeech: "noun",
  };
}

const card = {
  id: "card-1",
  category: "world",
  titles: { en: "A headline" },
  summaries: { en: "A summary." },
  captions: { en: "A caption." },
  sourceName: "The Guardian",
  sourceUrl: "https://example.com",
  publishedAt: "2026-09-01T00:00:00.000Z",
  imageUrl: null,
  vocabulary: [word("retrieve"), word("windfall")],
} as unknown as DailyNewsCard;

function saved(term: string): LibraryItem {
  return {
    id: term,
    word: term,
    word_language: "en",
    translation_language: "zh-TW",
    texts: { en: term, "zh-TW": "字" },
    examples: {},
  } as unknown as LibraryItem;
}

function open() {
  render(
    <VocabularyDrawer
      card={card}
      open
      onClose={() => {}}
      copy={copy}
      speakingKey={null}
      onSpeak={() => {}}
    />,
  );
}

/** The save button for one word, found through its accessible name. */
function saveButton(name: RegExp) {
  return screen.getByRole("button", { name });
}

beforeEach(() => {
  library.length = 0;
  saveCalls.length = 0;
  saveBehaviour = "ok";
  signedIn = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a word the reader already has", () => {
  it("says so, instead of offering a button that cannot work", () => {
    library.push(saved("retrieve"));

    open();

    expect(screen.getByText(copy.wordAlreadySaved)).toBeInTheDocument();
    expect(saveButton(/retrieve is already in your words/i)).toBeDisabled();
  });

  it("leaves the words they do not have alone", () => {
    library.push(saved("retrieve"));

    open();

    // "windfall" is new, so it still offers a save.
    expect(saveButton(/Add windfall to Vocabulary/i)).toBeEnabled();
    expect(screen.getAllByText(copy.wordAlreadySaved)).toHaveLength(1);
  });

  it("never sends a save for it", async () => {
    /*
     * The whole point. This is the request that used to throw
     * DuplicateVocabularyError into a console nobody was reading.
     */
    library.push(saved("retrieve"));

    open();
    await userEvent.click(saveButton(/retrieve is already in your words/i));

    expect(saveCalls).toEqual([]);
  });
});

describe("a word the reader does not have", () => {
  it("saves and shows as saved", async () => {
    open();

    await userEvent.click(saveButton(/Add windfall to Vocabulary/i));

    await waitFor(() =>
      expect(saveButton(new RegExp(copy.addedToVocabulary, "i"))).toBeDisabled(),
    );
    expect(saveCalls).toEqual([{ term: "windfall" }]);
  });
});

describe("when the save does not work", () => {
  it("says something rather than nothing", async () => {
    saveBehaviour = "explode";

    open();
    await userEvent.click(saveButton(/Add windfall to Vocabulary/i));

    expect(await screen.findByText(copy.saveWordError)).toBeInTheDocument();
  });

  it("asks the reader to sign in rather than going quiet", async () => {
    // This path was a bare `return`: the spinner stopped and that was all.
    signedIn = false;

    open();
    await userEvent.click(saveButton(/Add windfall to Vocabulary/i));

    expect(await screen.findByText(copy.saveWordLoginError)).toBeInTheDocument();
    expect(saveCalls).toEqual([]);
  });

  it("treats a word saved elsewhere mid-sheet as saved, not as an error", async () => {
    /*
     * The only way a duplicate can still reach the handler: the sheet was
     * open while the same word was saved on another screen. The reader
     * wanted it in the library and it is, so the button settles rather than
     * complaining.
     */
    saveBehaviour = "duplicate";

    open();
    await userEvent.click(saveButton(/Add windfall to Vocabulary/i));

    await waitFor(() =>
      expect(saveButton(new RegExp(copy.addedToVocabulary, "i"))).toBeDisabled(),
    );
    expect(screen.queryByText(copy.saveWordError)).not.toBeInTheDocument();
  });

  it("clears a stale error when the reader tries again", async () => {
    saveBehaviour = "explode";

    open();
    await userEvent.click(saveButton(/Add windfall to Vocabulary/i));
    expect(await screen.findByText(copy.saveWordError)).toBeInTheDocument();

    saveBehaviour = "ok";
    await userEvent.click(saveButton(/Add windfall to Vocabulary/i));

    await waitFor(() =>
      expect(screen.queryByText(copy.saveWordError)).not.toBeInTheDocument(),
    );
  });
});
