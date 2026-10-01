import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The camera's answer from the phone (2026-09-28)

   At a free-tier peak every Gemini model refused the camera at once. A
   classifier on the phone now names the object, from a vocabulary written
   out in all five languages, and the AI's answer upgrades it when it can.
   ========================================================= */

vi.mock("@/contexts/LearningLanguageContext", () => ({
  useLearningLanguageContext: () => ({ learningLanguage: "fr", nativeLanguage: "zh-TW" }),
}));
vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({ learningLanguage: "fr", supportLanguage: "zh-TW", pair: ["fr", "zh-TW"] as const }),
}));
vi.mock("@/hooks/useOnline", () => ({ reportNetworkFailure: () => {} }));
vi.mock("@/hooks/usePhonetics", () => ({ primePhonetics: () => {} }));
vi.mock("@/lib/home/homeMoments", () => ({ announceHomeMoment: () => {} }));
vi.mock("@/lib/lexicon/cache", () => ({ readCachedEntry: () => null, writeCachedEntry: () => {} }));

import useLexiconSearch from "@/hooks/lexicon/useLexiconSearch";
import { pickObjectWord, MIN_WORD_SCORE } from "@/lib/vision/onDeviceClassifier";
import {
  OBJECT_WORDS,
  findObjectWord,
  objectWordForClass,
} from "@/lib/vision/objectLexicon";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";

describe("the built-in object vocabulary", () => {
  it("has every word in all five languages", () => {
    for (const word of OBJECT_WORDS) {
      for (const language of ["en", "zh-TW", "es", "fr", "it"] as const) {
        expect(word[language]?.trim(), `${word.en} / ${language}`).toBeTruthy();
      }
    }
  });

  it("gathers classes into the everyday word", () => {
    expect(objectWordForClass(207)?.en).toBe("dog"); // golden retriever
    expect(objectWordForClass(151)?.en).toBe("dog"); // Chihuahua
    expect(objectWordForClass(504)?.en).toBe("mug"); // coffee mug
    expect(objectWordForClass(948)?.["zh-TW"]).toBe("蘋果"); // Granny Smith
    expect(objectWordForClass(620)?.fr).toBe("ordinateur portable");
  });

  it("names nothing for a class with no everyday word", () => {
    expect(objectWordForClass(432)).toBeNull(); // bassoon
  });

  it("finds a word from its spelling in any language", () => {
    expect(findObjectWord("Chaise", "fr")?.en).toBe("chair");
    expect(findObjectWord("椅子", "zh-TW")?.en).toBe("chair");
  });

  /*
   * A spelling that belongs to two words gives the commoner one (2026-10-01).
   * It used to give neither, so "bibliothèque" had no offline answer at all.
   */
  it("gives the commoner word for a spelling that belongs to two", () => {
    expect(findObjectWord("taza", "es")?.en).toBe("cup");
    expect(findObjectWord("bibliothèque", "fr")?.en).toBe("library");
    expect(findObjectWord("libreria", "it")?.en).toBe("bookstore");
  });

  /* Confident classes that used to have no word (Chi's iPhone, 2026-10-01). */
  it("names what the phone was sure of and used to leave unnamed", () => {
    expect(objectWordForClass(598)?.en).toBe("television"); // home theater
    expect(objectWordForClass(720)?.en).toBe("bottle"); // pill bottle
    expect(objectWordForClass(926)?.["zh-TW"]).toBe("火鍋"); // hot pot
  });
});

describe("choosing the phone's word", () => {
  it("adds up a word spread over several classes", () => {
    // Two retriever breeds, neither confident alone.
    const picked = pickObjectWord([
      { index: 207, score: 0.2 },
      { index: 208, score: 0.2 },
      { index: 504, score: 0.1 },
    ]);
    expect(picked?.word.en).toBe("dog");
    expect(picked?.score).toBeCloseTo(0.4);
  });

  it("says nothing below the bar", () => {
    expect(pickObjectWord([{ index: 722, score: MIN_WORD_SCORE - 0.01 }])).toBeNull();
  });

  it("ignores classes with no everyday word", () => {
    expect(pickObjectWord([{ index: 432, score: 0.9 }])).toBeNull();
  });
});

describe("the offline lookup of those words", () => {
  const french = { learning: "fr", support: "zh-TW", native: "zh-TW" } as const;

  it("answers a French camera word in Chinese with no model", async () => {
    const entry = await lookupOffline("chaise", { source: "fr", roles: french });
    expect(entry).toMatchObject({
      term: "chaise",
      translation: "椅子",
      termLanguage: "fr",
      translationLanguage: "zh-TW",
    });
    expect(entry.translationUnavailable).toBeFalsy();
  });
});

describe("the search, given the phone's word", () => {
  const chair = findObjectWord("chair", "en")!;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  function respond(body: unknown) {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => body,
    });
  }

  it("shows the card at once, with no request", async () => {
    const { result } = renderHook(() => useLexiconSearch({ items: [] }));

    act(() => result.current.submit("chaise", "image", { onDeviceWord: chair }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.result?.entry).toMatchObject({ term: "chaise", translation: "椅子" });
    expect(result.current.result?.onDevice).toBe("pending");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("replaces it with the AI's full answer", async () => {
    const { result } = renderHook(() => useLexiconSearch({ items: [] }));
    act(() => result.current.submit("chaise", "image", { onDeviceWord: chair }));
    await waitFor(() => expect(result.current.result?.onDevice).toBe("pending"));

    respond({
      term: "fauteuil",
      translation: "扶手椅",
      partOfSpeech: "noun",
      termExample: "Le fauteuil est confortable.",
      translationExample: "這張扶手椅很舒服。",
      confidence: "high",
      category: "objects",
      termLanguage: "fr",
      translationLanguage: "zh-TW",
      kind: "word",
    });
    act(() => result.current.submit("fauteuil", "image", { upgrade: true }));

    await waitFor(() => expect(result.current.result?.entry?.term).toBe("fauteuil"));
    expect(result.current.result?.onDevice).toBeUndefined();
  });

  it("keeps it, marked final, when the AI can only say the same thing", async () => {
    const { result } = renderHook(() => useLexiconSearch({ items: [] }));
    act(() => result.current.submit("chaise", "image", { onDeviceWord: chair }));
    await waitFor(() => expect(result.current.result?.onDevice).toBe("pending"));

    respond({
      term: "chaise",
      translation: "椅子",
      partOfSpeech: "noun",
      termExample: "",
      translationExample: "",
      confidence: "medium",
      category: "objects",
      degraded: true,
    });
    act(() => result.current.submit("chaise", "image", { upgrade: true }));

    await waitFor(() => expect(result.current.result?.onDevice).toBe("final"));
    expect(result.current.status).toBe("ready");
  });

  it("keeps it, marked final, when the lookup fails outright", async () => {
    const { result } = renderHook(() => useLexiconSearch({ items: [] }));
    act(() => result.current.submit("chaise", "image", { onDeviceWord: chair }));
    await waitFor(() => expect(result.current.result?.onDevice).toBe("pending"));

    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("offline"));
    act(() => result.current.submit("chaise", "image", { upgrade: true }));

    await waitFor(() => expect(result.current.result?.onDevice).toBe("final"));
    expect(result.current.result?.entry?.term).toBe("chaise");
    expect(result.current.status).toBe("ready");
  });
});

describe("the search, told the AI could not do better", () => {
  const chair = findObjectWord("chair", "en")!;

  it("keeps the phone's card and marks it final, with no request", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { result } = renderHook(() => useLexiconSearch({ items: [] }));
    act(() => result.current.submit("chaise", "image", { onDeviceWord: chair }));
    await waitFor(() => expect(result.current.result?.onDevice).toBe("pending"));

    act(() => result.current.submit("chaise", "image", { finalOnDevice: true }));

    await waitFor(() => expect(result.current.result?.onDevice).toBe("final"));
    expect(result.current.result?.entry?.term).toBe("chaise");
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
