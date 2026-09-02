import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   Selecting a word and being told what happened to it

   The add button on the selection toolbar did this on failure:

     } catch (error) {
       console.error("Failed to add word:", error);
       setSelection(null);
     }

   Clearing the selection dismisses the toolbar — which is exactly what
   success looks like. So a word that could not be saved looked like a word
   that had been, and the reader walked away believing they had it. That is
   worse than saying nothing: it is saying the wrong thing.

   Sending the same word to a partner failed silently too, though at least
   without the false confirmation.

   The wider sweep this came from was much smaller than it first appeared.
   Of 95 catch blocks in user-facing components, 45 already tell the reader
   something and 5 log only — and every one of those five is a deliberate
   background case with a comment saying so. This screen was the bug.
   ========================================================= */

const selection = { text: "windfall", top: 100, left: 50 };

let classifyBehaviour: "ok" | "explode" = "ok";
let saveBehaviour: "ok" | "duplicate" | "explode" = "ok";

vi.mock("@/hooks/useTextSelection", () => ({
  default: () => [selection, vi.fn()],
}));

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({
    learningLanguage: "en",
    supportLanguage: "zh-TW",
    pair: ["en", "zh-TW"],
  }),
}));

vi.mock("@/contexts/VocabularyContext", () => ({
  useVocabulary: () => ({ addItem: vi.fn() }),
}));

vi.mock("@/lib/vocabulary/classify", () => ({
  classifyText: async () => {
    if (classifyBehaviour === "explode") throw new Error("offline");
    return {
      term: "windfall",
      translation: "意外之財",
      termLanguage: "en",
      translationLanguage: "zh-TW",
      termExample: "An unexpected windfall.",
      translationExample: "一筆意外之財。",
      partOfSpeech: "noun",
      confidence: "high",
      category: "other",
    };
  },
}));

vi.mock("@/lib/vocabulary/service", async () => {
  const actual = await import("@/lib/vocabulary/createEntry");

  return {
    saveClassifiedVocabulary: async () => {
      if (saveBehaviour === "duplicate") {
        throw new actual.DuplicateVocabularyError({ id: "x" } as never);
      }
      if (saveBehaviour === "explode") throw new Error("network is gone");
      return { item: { id: "saved" } };
    },
  };
});

const VocabularySelection = (
  await import("@/components/vocabulary/VocabularySelection")
).default;

const copy = english.vocabulary.selection;

function open() {
  render(
    <VocabularySelection
      item={{ id: "note" } as unknown as VocabularyItem}
      onSendToPartner={() => {}}
    >
      <p>a paragraph with windfall in it</p>
    </VocabularySelection>,
  );
}

beforeEach(() => {
  classifyBehaviour = "ok";
  saveBehaviour = "ok";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("adding a selected word", () => {
  it("says so when it could not be saved", async () => {
    saveBehaviour = "explode";

    open();
    await userEvent.click(screen.getByRole("button", { name: copy.addWord }));

    expect(await screen.findByText(copy.saveFailed)).toBeInTheDocument();
  });

  it("does not dismiss the toolbar and pretend it worked", async () => {
    /*
     * The whole bug. Clearing the selection is what success looks like, so
     * the reader was shown a confirmation for a word that was never saved.
     */
    saveBehaviour = "explode";

    open();
    await userEvent.click(screen.getByRole("button", { name: copy.addWord }));

    await screen.findByText(copy.saveFailed);
    expect(screen.queryByRole("button", { name: copy.addedWord })).toBeNull();
  });

  it("names the duplicate rather than calling it a failure", async () => {
    saveBehaviour = "duplicate";

    open();
    await userEvent.click(screen.getByRole("button", { name: copy.addWord }));

    expect(await screen.findByText(copy.alreadySaved)).toBeInTheDocument();
  });

  it("stays quiet when the save works", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: copy.addWord }));

    expect(screen.queryByText(copy.saveFailed)).toBeNull();
    expect(screen.queryByText(copy.alreadySaved)).toBeNull();
  });
});

describe("sending a selected word to a partner", () => {
  it("says so when the word could not be prepared", async () => {
    classifyBehaviour = "explode";

    open();
    await userEvent.click(
      screen.getByRole("button", { name: copy.sendToPartner }),
    );

    expect(await screen.findByText(copy.sendFailed)).toBeInTheDocument();
  });
});

describe("what the toolbar tells assistive technology", () => {
  it("labels its buttons in the reader's language", () => {
    /*
     * These were hard-coded Chinese — 加入單字本 and 傳送給夥伴 — so a French
     * or Spanish reader's screen reader announced them in a language they
     * may not have.
     */
    open();

    expect(
      screen.getByRole("button", { name: copy.addWord }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.sendToPartner }),
    ).toBeInTheDocument();
  });
});
