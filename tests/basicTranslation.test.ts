import { describe, expect, it, vi } from "vitest";

import { basicTranslationInBrowser, translateWithMyMemory } from "@/lib/translation/myMemory";
import { lookupOffline } from "@/lib/vocabulary/offlineLookup";

/*
 * 2026-09-28 from ~14:00 UTC every Gemini and Gemma model this key reaches
 * answered 503, and every lookup outside English and Chinese came back with
 * no translation. A plain translation service that is not Google's now
 * fills that gap, marked as basic.
 */

function replying(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => body }) as unknown as typeof fetch;
}

describe("translateWithMyMemory", () => {
  it("returns the translation", async () => {
    const fetchImpl = replying({ responseStatus: 200, responseData: { translatedText: "蝴蝶" } });
    await expect(translateWithMyMemory("papillon", "fr", "zh-TW", fetchImpl)).resolves.toBe("蝴蝶");

    const url = new URL(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]));
    expect(url.searchParams.get("langpair")).toBe("fr-FR|zh-TW");
  });

  it("looks past an answer that only echoes the word", async () => {
    const fetchImpl = replying({
      responseStatus: 200,
      responseData: { translatedText: "chaise" },
      matches: [
        { translation: "chaise", match: 0.99 },
        { translation: "chair", match: 0.9 },
      ],
    });
    await expect(translateWithMyMemory("chaise", "fr", "en", fetchImpl)).resolves.toBe("chair");
  });

  it("keeps the reader's lower case", async () => {
    const fetchImpl = replying({ responseStatus: 200, responseData: { translatedText: "Dejeuner" } });
    await expect(translateWithMyMemory("早餐", "zh-TW", "fr", fetchImpl)).resolves.toBe("dejeuner");
  });

  it("refuses the service's warnings written where a translation would be", async () => {
    const fetchImpl = replying({
      responseStatus: 200,
      responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" },
    });
    await expect(translateWithMyMemory("ventana", "es", "zh-TW", fetchImpl)).resolves.toBeNull();
  });

  it("refuses a Chinese answer with no Chinese in it", async () => {
    const fetchImpl = replying({ responseStatus: 200, responseData: { translatedText: "window" } });
    await expect(translateWithMyMemory("ventana", "es", "zh-TW", fetchImpl)).resolves.toBeNull();
  });

  it("gives up quietly when the allowance is spent or the network is down", async () => {
    await expect(
      translateWithMyMemory("ventana", "es", "zh-TW", replying({ quotaFinished: true, responseStatus: 429 })),
    ).resolves.toBeNull();
    await expect(
      translateWithMyMemory(
        "ventana",
        "es",
        "zh-TW",
        vi.fn().mockRejectedValue(new TypeError("offline")) as unknown as typeof fetch,
      ),
    ).resolves.toBeNull();
  });
});

describe("lookupOffline, with every model busy", () => {
  const french = { learning: "fr", support: "zh-TW", native: "zh-TW" } as const;

  it("answers a French word with a basic translation", async () => {
    const translate = vi.fn().mockResolvedValue("幸福");

    const entry = await lookupOffline("bonheur", { source: "fr", roles: french }, translate);

    expect(translate).toHaveBeenCalledWith("bonheur", "fr", "zh-TW");
    expect(entry).toMatchObject({
      term: "bonheur",
      translation: "幸福",
      termLanguage: "fr",
      translationLanguage: "zh-TW",
      basicTranslation: true,
    });
    expect(entry.translationUnavailable).toBeFalsy();
  });

  it("still admits it has nothing when the service has nothing either", async () => {
    const entry = await lookupOffline(
      "bonheur",
      { source: "fr", roles: french },
      vi.fn().mockResolvedValue(null),
    );
    expect(entry.translationUnavailable).toBe(true);
    expect(entry.basicTranslation).toBeFalsy();
  });
});

describe("basicTranslationInBrowser", () => {
  it("tries the language being studied when the detected one gives nothing", async () => {
    // "ventana" is easily taken for English; as English it comes back unchanged.
    const fetchImpl = vi.fn(async (url: URL) => ({
      ok: true,
      json: async () => ({
        responseStatus: 200,
        responseData: {
          translatedText: url.searchParams.get("langpair")?.startsWith("es") ? "窗" : "Ventana",
        },
      }),
    })) as unknown as typeof fetch;

    await expect(
      basicTranslationInBrowser(
        { term: "ventana", termLanguage: "en", translationLanguage: "zh-TW" },
        "es",
        fetchImpl,
      ),
    ).resolves.toEqual({ translation: "窗", termLanguage: "es" });
  });

  it("gives nothing when no target language is known", async () => {
    await expect(
      basicTranslationInBrowser({ term: "ventana" }, "es", vi.fn() as unknown as typeof fetch),
    ).resolves.toBeNull();
  });
});
