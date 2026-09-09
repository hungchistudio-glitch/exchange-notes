import { describe, expect, it } from "vitest";

import {
  decodeWordCardMessage,
  encodeWordCardMessage,
} from "@/lib/messages/wordCard";

/* =========================================================
   The picture on a card someone sent you

   A word card is JSON inside a message body, which means the image path in
   it is a string that arrived from another device and then becomes part of
   a request. That is the whole reason decode checks its shape rather than
   trusting it: everything else in the card is text that gets rendered, and
   this one field gets *fetched*.
   ========================================================= */

const base = {
  word: "bouteille",
  translation: "bottle",
  wordLanguage: "fr" as const,
  translationLanguage: "en" as const,
};

const path = "0f9e8d7c-6b5a-4321-8f0e-1d2c3b4a5968/shared/abc-123.webp";

describe("carrying a picture on a shared card", () => {
  it("round-trips a published path", () => {
    const decoded = decodeWordCardMessage(
      encodeWordCardMessage({ ...base, imagePath: path }),
    );

    expect(decoded?.imagePath).toBe(path);
  });

  it("leaves the key out entirely when there is no picture", () => {
    /*
     * Message bodies are permanent and there are a lot of them. A key that
     * always means nothing is bytes in every card anybody ever sends.
     */
    const body = encodeWordCardMessage(base);

    expect(body).not.toContain("imagePath");
    expect(decodeWordCardMessage(body)?.imagePath).toBeUndefined();
  });

  it("still reads a card sent before pictures existed", () => {
    // The migration promise, at the message layer: these bodies are already
    // in people's conversations and cannot be rewritten.
    const legacy =
      "⟧EXCHANGE_NOTES_WORD⟨" +
      JSON.stringify({ word: "chien", translation: "dog" });

    const decoded = decodeWordCardMessage(legacy);

    expect(decoded?.word).toBe("chien");
    expect(decoded?.imagePath).toBeUndefined();
  });
});

describe("refusing a path that is not one of ours", () => {
  function decodeWith(imagePath: unknown) {
    return decodeWordCardMessage(
      "⟧EXCHANGE_NOTES_WORD⟨" +
        JSON.stringify({ ...base, imagePath }),
    );
  }

  it("drops a path that tries to climb out of the folder", () => {
    // The one that matters. This string becomes a query parameter on a
    // route that signs storage objects.
    expect(decodeWith("../../etc/passwd")?.imagePath).toBeUndefined();
    expect(
      decodeWith(
        "0f9e8d7c-6b5a-4321-8f0e-1d2c3b4a5968/shared/../../other/card.webp",
      )?.imagePath,
    ).toBeUndefined();
  });

  it("drops an absolute URL", () => {
    expect(
      decodeWith("https://example.com/steal.webp")?.imagePath,
    ).toBeUndefined();
  });

  it("drops a path whose first segment is not a user id", () => {
    expect(decodeWith("admin/shared/card.webp")?.imagePath).toBeUndefined();
    expect(decodeWith("shared/card.webp")?.imagePath).toBeUndefined();
  });

  it("drops anything that is not a string", () => {
    expect(decodeWith(42)?.imagePath).toBeUndefined();
    expect(decodeWith(null)?.imagePath).toBeUndefined();
    expect(decodeWith({ path })?.imagePath).toBeUndefined();
  });

  it("keeps the rest of the card when the path is refused", () => {
    // A bad path costs the picture, never the word.
    const decoded = decodeWith("../../etc/passwd");

    expect(decoded?.word).toBe("bouteille");
    expect(decoded?.translation).toBe("bottle");
  });
});
