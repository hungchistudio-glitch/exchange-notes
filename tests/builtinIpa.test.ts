import { afterEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   IPA the app already has (Chi, 2026-10-03: "混合來源")

   The ~4,000 first forms of the built-in dictionary carry their IPA on the
   server: English from CMUdict, Spanish by rule, French and Italian drafted
   and then checked by a stronger model. A card for one of them is answered
   without the cache, a dictionary or a model.
   ========================================================= */

const service = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: service.create }));

import { BUILTIN_IPA_DATA } from "@/lib/pronunciation/builtinIpaData";
import { builtinIpa } from "@/lib/pronunciation/builtinIpa";
import { transcribe } from "@/lib/pronunciation/ipaSource";
import { OBJECT_WORDS } from "@/lib/vision/objectLexicon";
import { CORE_LEXICON_SOURCE } from "@/lib/vocabulary/coreLexiconData";

afterEach(() => {
  service.create.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const COLUMN = { en: 2, es: 4, fr: 5, it: 6 } as const;

/** Every first form in either built-in dictionary: the words and the camera's. */
function firstForms(language: keyof typeof COLUMN): Set<string> {
  return new Set([
    ...CORE_LEXICON_SOURCE.split("\n")
      .filter((line) => /^(noun|verb|adjective|phrase|other)\|/.test(line))
      .map((line) => line.split("|")[COLUMN[language]].split(";")[0].trim()),
    ...OBJECT_WORDS.map((word) => word[language]),
  ]);
}

describe("the data", () => {
  it.each(Object.keys(COLUMN) as Array<keyof typeof COLUMN>)(
    "%s: one well-formed line per dictionary word, nearly all of them",
    (language) => {
      const forms = firstForms(language);
      const lines = BUILTIN_IPA_DATA[language].split("\n").filter(Boolean);

      expect(lines.length).toBeGreaterThan(forms.size * 0.95);
      for (const line of lines) {
        const [text, ipa, extra] = line.split("|");
        expect(extra).toBeUndefined();
        expect(forms.has(text)).toBe(true);
        expect(ipa).toMatch(/^\/[^/]+\/$/);
        // The IPA letter, never the keyboard g.
        expect(ipa).not.toMatch(/g/);
      }
    },
  );

  it("marks no stress in French, and stress in the other three", () => {
    expect(BUILTIN_IPA_DATA.fr).not.toMatch(/ˈ/);
    expect(builtinIpa("grazie", "it")).toBe("/ˈɡrattsje/");
    expect(builtinIpa("mejor", "es")).toBe("/meˈxoɾ/");
    expect(builtinIpa("good morning", "en")).toBe("/ɡʊd ˈmɔrnɪŋ/");
  });
});

describe("looking a word up", () => {
  it("finds it as written, in any case, with either apostrophe", () => {
    expect(builtinIpa("bonjour", "fr")).toBe("/bɔ̃ʒuʁ/");
    expect(builtinIpa("Bonjour", "fr")).toBe("/bɔ̃ʒuʁ/");
    expect(builtinIpa("S’il vous plaît", "fr")).toBe("/sil vu plɛ/");
    expect(builtinIpa("città", "it")).toBe("/tʃitˈta/");
  });

  it("knows the camera's words too", () => {
    expect(builtinIpa("apple", "en")).toBe("/ˈæpəl/");
    expect(builtinIpa("chaise", "fr")).toBe("/ʃɛz/");
    expect(builtinIpa("manzana", "es")).toBe("/manˈsana/");
    expect(builtinIpa("sedia", "it")).toBe("/ˈsɛdja/");
  });

  it("takes the sense the dictionary means, not CMUdict's first entry", () => {
    // The dictionary's "read" and "live" are verbs; its "wind" is weather.
    expect(builtinIpa("read", "en")).toBe("/rid/");
    expect(builtinIpa("live", "en")).toBe("/lɪv/");
    expect(builtinIpa("wind", "en")).toBe("/wɪnd/");
    expect(builtinIpa("subject", "en")).toBe("/ˈsʌbdʒɪkt/");
  });

  it("never answers for another form, another language, or Chinese", () => {
    expect(builtinIpa("chats", "fr")).toBeNull();
    expect(builtinIpa("bonjour", "it")).toBeNull();
    expect(builtinIpa("蘋果", "zh-TW")).toBeNull();
    expect(builtinIpa("", "en")).toBeNull();
  });
});

describe("transcribing", () => {
  it("answers dictionary words without the cache, a dictionary or a model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { found, unavailable } = await transcribe(["bonjour", "s'il vous plaît"], "fr");

    expect(Object.fromEntries(found)).toEqual({
      bonjour: "/bɔ̃ʒuʁ/",
      "s'il vous plaît": "/sil vu plɛ/",
    });
    expect(unavailable).toEqual([]);
    expect(service.create).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends only the words it does not know on to the cache", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const asked: string[][] = [];
    service.create.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async (_column: string, texts: string[]) => {
              asked.push(texts);
              return { data: [{ text: "abbiocco", ipa: "/abˈbjɔkko/" }], error: null };
            },
          }),
        }),
      }),
    });

    const { found } = await transcribe(["grazie", "abbiocco"], "it");

    expect(asked).toEqual([["abbiocco"]]);
    expect(found.get("grazie")).toBe("/ˈɡrattsje/");
    expect(found.get("abbiocco")).toBe("/abˈbjɔkko/");
  });
});
