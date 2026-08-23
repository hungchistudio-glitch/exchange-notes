import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NewsCardMessage from "@/components/messages/NewsCardMessage";

/* =========================================================
   A shared card whose languages are not the reader's

   The messages page went white, and this is why. The pair a screen renders
   with briefly came from the *content* rather than the reader, so a card
   that carried neither of their languages resolved to fewer than two — and
   every caller destructures a pair and calls getLanguage() on both halves.
   getLanguage(undefined).speechTag throws, which takes the whole route with
   it rather than one card.
   ========================================================= */

vi.mock("@/hooks/useDisplayLanguages", () => ({
  default: () => ({
    learningLanguage: "it",
    supportLanguage: "en",
    pair: ["it", "en"] as const,
  }),
}));

vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

const card = {
  id: "https://example.com/a",
  category: "Society",
  titles: { es: "Prisiones", "zh-TW": "監獄" },
  summaries: { es: "Un resumen." },
  captions: {},
  sourceName: "The Guardian",
  sourceUrl: "https://example.com/a",
  publishedAt: "2026-08-22T00:00:00Z",
  imageUrl: null,
  vocabulary: [],
};

describe("NewsCardMessage", () => {
  it("renders a card that carries neither of the reader's languages", () => {
    // Not "renders it in Spanish" — renders it *at all*. The card has
    // nothing to say to this reader and says nothing, which is a quiet card
    // rather than a broken page.
    expect(() =>
      render(
        <NewsCardMessage
          card={card as never}
          createdAt="2026-08-22T00:00:00Z"
        />,
      ),
    ).not.toThrow();
  });

  it("shows no Spanish to a reader who did not choose Spanish", () => {
    const { container } = render(
      <NewsCardMessage card={card as never} createdAt="2026-08-22T00:00:00Z" />,
    );

    expect(container.textContent).not.toContain("Prisiones");
    expect(container.textContent).not.toContain("Un resumen");
  });
});

/* =========================================================
   A word card in the conversation history
   ========================================================= */

import WordCardMessage from "@/components/messages/WordCardMessage";
import {
  WORD_CARD_MARKER,
  decodeWordCardMessage,
  encodeWordCardMessage,
} from "@/lib/messages/wordCard";
import english from "@/lib/i18n/en";

describe("WordCardMessage", () => {
  it("leads in the language being learned, not the one it was sent as", () => {
    // Sent by someone studying Spanish, read by someone studying Italian.
    const card = {
      word: "te amo",
      translation: "I love you",
      wordLanguage: "es" as const,
      translationLanguage: "en" as const,
      texts: { en: "I love you", es: "te amo", it: "ti amo", fr: "je t'aime" },
      examples: {},
      partOfSpeech: "phrase",
    };

    const { container } = render(
      <WordCardMessage
        card={card as never}
        createdAt="2026-08-22T00:00:00Z"
        learningLanguage="it"
        t={english}
        saved={false}
        saving={false}
        onSave={() => {}}
        onShare={() => {}}
      />,
    );

    expect(container.textContent).toContain("ti amo");
    expect(container.textContent).toContain("I love you");
    // Spanish is what the card was sent as, and is not what this reader chose.
    expect(container.textContent).not.toContain("te amo");
  });

  it("annotates both sides in whatever systems their languages use", async () => {
    /*
     * The chat card listed pinyin and zhuyin and nothing else, so a word in
     * a conversation carried an annotation for exactly one of the five
     * languages the app teaches — and a reader could not tell that from the
     * word simply not having one.
     */
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as { texts: string[]; language: string };
        return {
          ok: true,
          json: async () => ({
            phonetics: Object.fromEntries(
              body.texts.map((text) => [
                text,
                body.language === "it" ? { ipa: "/ti ˈamo/" } : {},
              ]),
            ),
          }),
        };
      }),
    );

    const card = {
      word: "ti amo",
      translation: "I love you",
      wordLanguage: "it" as const,
      translationLanguage: "en" as const,
      texts: { en: "I love you", it: "ti amo" },
      examples: {},
    };

    const { findByText } = render(
      <WordCardMessage
        card={card as never}
        createdAt="2026-08-22T00:00:00Z"
        learningLanguage="it"
        t={english}
        saved={false}
        saving={false}
        onSave={() => {}}
        onShare={() => {}}
      />,
    );

    expect(await findByText("/ti ˈamo/")).toBeTruthy();
  });

  it("brings a card sent in two other languages into the reader's", async () => {
    /*
     * The screenshot: a menu item sent as Chinese and English on 19 August,
     * read by someone learning French with an English interface. It led in
     * Chinese — a language absent from all three of their settings — because
     * the card carries no French and nothing asked for any.
     *
     * The message is not rewritten. The rendering is translated.
     */
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { body: string }) => {
        if (String(url).includes("text-translate")) {
          return {
            ok: true,
            json: async () => ({
              texts: { "Classic American Burger": "Burger américain classique" },
              unavailable: [],
            }),
          };
        }

        const body = JSON.parse(init.body) as { texts: string[] };
        return {
          ok: true,
          json: async () => ({
            phonetics: Object.fromEntries(body.texts.map((t) => [t, {}])),
          }),
        };
      }),
    );

    const legacy = {
      word: "美式經典漢堡",
      translation: "Classic American Burger",
      wordLanguage: "zh-TW" as const,
      translationLanguage: "en" as const,
      examples: {},
    };

    const { findByText, container } = render(
      <WordCardMessage
        card={legacy as never}
        createdAt="2026-08-19T00:00:00Z"
        learningLanguage="fr"
        t={english}
        saved={false}
        saving={false}
        onSave={() => {}}
        onShare={() => {}}
      />,
    );

    expect(await findByText("Burger américain classique")).toBeTruthy();

    // English is the interface language and stays as the gloss. Chinese is
    // in none of this reader's three settings and goes.
    expect(container.textContent).toContain("Classic American Burger");
    expect(container.textContent).not.toContain("美式經典漢堡");
  });

  it("asks for nothing when the card already holds the reader's languages", async () => {
    const asked: string[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        asked.push(String(url));
        return { ok: true, json: async () => ({ phonetics: {}, texts: {} }) };
      }),
    );

    render(
      <WordCardMessage
        card={
          {
            word: "ti amo",
            translation: "I love you",
            wordLanguage: "it",
            translationLanguage: "en",
            texts: { it: "ti amo", en: "I love you" },
            examples: {},
          } as never
        }
        createdAt="2026-08-22T00:00:00Z"
        learningLanguage="it"
        t={english}
        saved={false}
        saving={false}
        onSave={() => {}}
        onShare={() => {}}
      />,
    );

    await new Promise((resolve) => setTimeout(resolve, 120));

    // Every card sent since shared cards started carrying every language is
    // this one, and none of them should cost a translation.
    expect(asked.some((url) => url.includes("text-translate"))).toBe(false);
  });

  it("carries every language through send and receive", () => {
    // Without this the card is two languages forever, and a reader studying
    // a third sees whichever two the sender happened to have.
    const encoded = encodeWordCardMessage({
      word: "ti amo",
      translation: "I love you",
      wordLanguage: "it",
      translationLanguage: "en",
      texts: { en: "I love you", it: "ti amo", fr: "je t'aime" },
    });

    expect(decodeWordCardMessage(encoded)?.texts?.fr).toBe("je t'aime");
  });

  it("still reads a card sent before cards carried every language", () => {
    const legacy = `${WORD_CARD_MARKER}${JSON.stringify({
      word: "prison",
      translation: "監獄",
      englishExample: "The prison is full.",
    })}`;

    const decoded = decodeWordCardMessage(legacy);

    expect(decoded?.word).toBe("prison");
    expect(decoded?.examples?.en).toBe("The prison is full.");
  });
});
