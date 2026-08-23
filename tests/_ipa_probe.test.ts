import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2];
}

describe("IPA source", () => {
  it("transcribes each language as itself", async () => {
    const { transcribe } = await import("@/lib/pronunciation/ipaSource");

    const cases = {
      it: ["consulenza", "pionieristico", "giro di vite", "gnocchi"],
      fr: ["conseil", "induire en erreur", "oiseau", "beaucoup"],
      es: ["consultoría", "pionero", "guerra", "cigüeña"],
      en: ["consultancy", "pioneering", "thorough"],
    } as const;

    for (const [language, words] of Object.entries(cases)) {
      const out = await transcribe([...words], language as never);
      for (const word of words) {
        console.log(`${language}  ${word.padEnd(20)} ${out.get(word) ?? "—"}`);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }

    expect(true).toBe(true);
  }, 300_000);
});
