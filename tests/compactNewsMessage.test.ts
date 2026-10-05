import { expect, it } from "vitest";
import { decodeNewsCardMessage, encodeNewsCardMessage } from "@/lib/messages/newsCard";
import { messagePreview } from "@/lib/messages/preview";
import { LANGUAGE_CODES } from "@/lib/languages";

it("fits a five-language news card into the database limit and remains readable", () => {
  const titles = Object.fromEntries(LANGUAGE_CODES.map(language => [language, `${language} headline `.repeat(15)]));
  const body = encodeNewsCardMessage({
    titles, summaries: Object.fromEntries(LANGUAGE_CODES.map(language => [language, "summary ".repeat(200)])),
    vocabulary: Array.from({ length: 12 }, () => ({ texts: titles, examples: titles })),
    sourceName: "Source", sourceUrl: "https://example.com/article",
  });
  expect(body.length).toBeLessThanOrEqual(2000);
  const decoded = decodeNewsCardMessage(body)!;
  expect(Object.keys(decoded.titles)).toHaveLength(5);
  expect(decoded.sourceUrl).toBe("https://example.com/article");
  expect(messagePreview(body)).toContain("headline");
  expect(messagePreview(body)).not.toContain("{");
});
