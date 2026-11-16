import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { InterfaceLanguage } from "@/lib/appPreferences";
import { LANGUAGE_CODES } from "@/lib/languages";
import * as englishSounds from "@/lib/pronunciation/englishSounds";
import { heteronymsFor } from "@/lib/pronunciation/heteronyms";
import { listPronunciationPacks } from "@/lib/pronunciation/lab/registry";
import { hasLabText, labTextFor, loadLabText } from "@/lib/pronunciation/labText";
import { localize, type LocalizedText } from "@/lib/pronunciation/localizedText";
import { deriveTeachingSteps } from "@/lib/pronunciation/teachingSteps";
import { zhuyinSounds } from "@/lib/pronunciation/zhuyinSounds";

/* =========================================================
   The Lab teaches in all seven interface languages (Chi, 2026-11-16)

   Every piece of teaching text in the packs and sound tables, and every
   meaning of a word's other readings, has a version for every interface
   language, either in the pack itself or in
   the per-language table loaded on demand. Anything that would have been
   shown in English to a Spanish, French, Italian, Japanese or Korean
   reader fails here, with the words that are missing.
   ========================================================= */

const LATER: InterfaceLanguage[] = ["spanish", "french", "italian", "japanese", "korean"];

/** Every teaching text object reachable from a value. */
function collect(value: unknown, into: LocalizedText[] = [], seen = new Set<unknown>()): LocalizedText[] {
  if (!value || typeof value !== "object" || seen.has(value)) return into;
  seen.add(value);
  const record = value as Record<string, unknown>;
  if (typeof record.english === "string" && typeof record["traditional-chinese"] === "string") {
    into.push(record as LocalizedText);
    return into;
  }
  for (const inner of Object.values(record)) collect(inner, into, seen);
  return into;
}

const PHONETICS = [
  { manner: "plosive", place: "bilabial", voiced: false, aspirated: true, nasal: false, lipRounding: "unrounded", jawOpening: 0.05, tongueRegion: "front", tongueHeight: 0.4, tongueFrontness: 0.5, contactZone: "lips" },
  { manner: "fricative", place: "alveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "rounded", jawOpening: 0.2, tongueRegion: "tip", tongueHeight: 0.8, tongueFrontness: 0.9, contactZone: "alveolar" },
  { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.9, tongueRegion: "middle", tongueHeight: 0.25, tongueFrontness: 0.75, contactZone: "none" },
  { manner: "nasal", place: "velar", voiced: true, aspirated: false, nasal: true, lipRounding: "unrounded", jawOpening: 0.4, tongueRegion: "back", tongueHeight: 0.7, tongueFrontness: 0.2, contactZone: "velum" },
] as const;

const TEXTS = [
  ...collect(listPronunciationPacks()),
  ...collect(englishSounds),
  ...collect(zhuyinSounds),
  /* The other readings of a word, and what each one means. */
  ...collect(LANGUAGE_CODES.map((code) => heteronymsFor(code))),
  ...PHONETICS.flatMap((phonetics) =>
    collect(deriveTeachingSteps(phonetics as unknown as Parameters<typeof deriveTeachingSteps>[0])),
  ),
];

beforeAll(async () => {
  await Promise.all(LATER.map((language) => loadLabText(language)));
});

describe("the Lab's teaching text", () => {
  it("is found in the packs and the sound tables", () => {
    expect(TEXTS.length).toBeGreaterThan(1000);
  });

  it.each(LATER)("is written in %s wherever it is in English", (language) => {
    expect(hasLabText(language)).toBe(true);
    const missing = TEXTS.filter(
      (text) =>
        text.english !== text["traditional-chinese"] &&
        !text[language] &&
        !labTextFor(language, text.english!),
    ).map((text) => text.english);
    expect([...new Set(missing)]).toEqual([]);
  });

  it("reads the reader's language from the table, and keeps a pack's own words first", () => {
    expect(localize({ english: "Mouth shape", "traditional-chinese": "嘴型" }, "japanese")).toBe("口の形");
    expect(localize({ english: "Mouth shape", "traditional-chinese": "嘴型" }, "korean")).toBe("입 모양");
    expect(localize({ english: "Vowels", "traditional-chinese": "母音", spanish: "Vocales propias" }, "spanish")).toBe(
      "Vocales propias",
    );
    expect(localize({ english: "Not in any table", "traditional-chinese": "不在表裡" }, "french")).toBe(
      "Not in any table",
    );
  });
});

describe("a screen that teaches", () => {
  it("redraws in the reader's language once the table arrives", async () => {
    vi.resetModules();
    const labText = await import("@/lib/pronunciation/labText");
    const { localize: freshLocalize } = await import("@/lib/pronunciation/localizedText");
    const { default: useLabText } = await import("@/hooks/useLabText");

    function Label() {
      useLabText("italian");
      return <p>{freshLocalize({ english: "Mouth shape", "traditional-chinese": "嘴型" }, "italian")}</p>;
    }

    render(<Label />);
    expect(labText.hasLabText("italian")).toBe(false);
    expect(await screen.findByText("Forma della bocca")).toBeInTheDocument();
  });
});
