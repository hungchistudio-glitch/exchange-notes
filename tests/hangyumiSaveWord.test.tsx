import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SaveWord } from "@/lib/hangyumi/service";

/* =========================================================
   Keeping a Hangyumi word (components/hangyumi/HangyumiPage)

   Through the one door every save uses, glossed in the reader's own
   language by the app's cached word translation, or by the round's clue
   when no translation can be had; a word already kept is not an error.
   ========================================================= */

const calls = vi.hoisted(() => ({
  create: vi.fn(),
  saveWord: null as SaveWord | null,
}));

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({ learningLanguage: "fr", nativeLanguage: "zh-TW" }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "reader" } } }) } }),
}));
vi.mock("@/lib/vocabulary/createEntry", async () => {
  class DuplicateVocabularyError extends Error {}
  return { DuplicateVocabularyError, createVocabularyEntry: calls.create };
});
vi.mock("@/components/hangyumi/HangyumiGame", () => ({
  default: ({ saveWord }: { saveWord: SaveWord }) => {
    calls.saveWord = saveWord;
    return null;
  },
}));

const word = { answer: "éphémère", language: "fr" as const, partOfSpeech: "adj" as const, hint: "lasting a very short time", hintLanguage: "en" as const };

async function mount() {
  const { default: HangyumiPage } = await import("@/components/hangyumi/HangyumiPage");
  render(<HangyumiPage />);
  return calls.saveWord!;
}

afterEach(() => {
  calls.create.mockReset();
  vi.unstubAllGlobals();
});

describe("keeping a Hangyumi word", () => {
  it("glosses it in the reader's own language", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ texts: { "éphémère": "短暫的" }, unavailable: [] }))));
    const save = await mount();
    await act(async () => expect(await save(word)).toBe("saved"));
    expect(fetch).toHaveBeenCalledWith("/api/text-translate", expect.objectContaining({
      body: JSON.stringify({ texts: ["éphémère"], from: "fr", to: "zh-TW" }),
    }));
    expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: "reader", term: "éphémère", translation: "短暫的", partOfSpeech: "adj",
      language: { pair: ["fr", "zh-TW"], stated: { term: "fr", translation: "zh-TW" } },
    }));
  });

  it("falls back to the clue, in the clue's language, when no translation comes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ texts: {}, unavailable: ["éphémère"], quotaExhausted: true }))));
    const save = await mount();
    await act(async () => expect(await save(word)).toBe("saved"));
    expect(calls.create).toHaveBeenCalledWith(expect.objectContaining({
      translation: "lasting a very short time",
      language: { pair: ["fr", "en"], stated: { term: "fr", translation: "en" } },
    }));
  });

  it("calls a word already kept a duplicate, not a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { DuplicateVocabularyError } = await import("@/lib/vocabulary/createEntry");
    calls.create.mockRejectedValueOnce(new DuplicateVocabularyError({} as never));
    const save = await mount();
    await act(async () => expect(await save(word)).toBe("duplicate"));
  });
});
