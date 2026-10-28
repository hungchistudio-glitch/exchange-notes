import { pinyinToZhuyin } from "@/lib/chinese/taiwanReadings";
import type { LanguageCode } from "@/lib/languages";

import type { TermReading } from "./types";

/** Most readings a headword is shown with. */
const MAX_TERM_READINGS = 4;

/**
 * The model's readings, kept only when they are readings: at least two,
 * different from each other, each complete. Chinese ones gain zhuyin here,
 * on the server, so no screen has to carry the converter.
 */
export function readTermReadings(value: unknown, termLanguage: LanguageCode | undefined): TermReading[] {
  if (!Array.isArray(value)) return [];
  const readings: TermReading[] = [];
  const seen = new Set<string>();

  for (const item of value.slice(0, MAX_TERM_READINGS)) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const pronunciation = typeof candidate.pronunciation === "string" ? candidate.pronunciation.trim() : "";
    const meaning = typeof candidate.meaning === "string" ? candidate.meaning.trim() : "";
    const example = typeof candidate.example === "string" ? candidate.example.trim() : "";
    if (!pronunciation || !meaning || !example) continue;

    const key = pronunciation.toLocaleLowerCase().replace(/[/[\]ˈˌ.\s]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);

    if (termLanguage === "zh-TW") {
      const zhuyin = pinyinToZhuyin(pronunciation);
      if (!zhuyin) continue;
      readings.push({ pronunciation, zhuyin, meaning, example });
    } else {
      readings.push({ pronunciation, meaning, example });
    }
  }

  return readings.length >= 2 ? readings : [];
}
