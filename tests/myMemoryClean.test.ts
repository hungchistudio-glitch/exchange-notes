import { describe, expect, it } from "vitest";

import { cleanTranslation, translateWithMyMemory } from "@/lib/translation/myMemory";

/* =========================================================
   What the basic translation service hands back, cleaned

   Measured on production 2026-10-01: "mitochondria" came back from MyMemory
   as "<g>粒線體 (Mitochondria)</g>" — markup from a translated document and
   the query echoed in brackets — and was shown on the card as it was.
   ========================================================= */

describe("cleanTranslation", () => {
  it("drops markup and the query echoed in brackets", () => {
    expect(cleanTranslation("<g>粒線體 (Mitochondria)</g>", "mitochondria")).toBe("粒線體");
  });

  it("decodes the entities the service writes", () => {
    expect(cleanTranslation("l&#39;eau", "water")).toBe("l'eau");
  });

  it("leaves an ordinary answer alone", () => {
    expect(cleanTranslation("bonheur (n.)", "happiness")).toBe("bonheur (n.)");
  });
});

describe("translateWithMyMemory", () => {
  it("returns the cleaned answer", async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          responseStatus: 200,
          responseData: { translatedText: "<g>粒線體 (Mitochondria)</g>" },
          matches: [],
        }),
      )) as unknown as typeof fetch;

    await expect(
      translateWithMyMemory("mitochondria", "en", "zh-TW", fetchImpl),
    ).resolves.toBe("粒線體");
  });
});
