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
