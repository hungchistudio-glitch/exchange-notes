"use client";

import OtherReadings from "@/components/pronunciation/OtherReadings";
import type { LanguageCode } from "@/lib/languages";

/** Words as a lookup might bring them, one or two per language. */
const SAMPLES: Array<{ text: string; language: LanguageCode; partOfSpeech?: string; ipa?: string }> = [
  { text: "銀行", language: "zh-TW" },
  { text: "長", language: "zh-TW" },
  { text: "record", language: "en", partOfSpeech: "verb" },
  { text: "lead", language: "en" },
  { text: "fils", language: "fr" },
  { text: "pesca", language: "it" },
  { text: "publicó", language: "es" },
];

export default function HeteronymsReview() {
  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-4 bg-surface px-4 py-8">
      <h1 className="text-lg font-semibold">Heteronyms review</h1>
      {SAMPLES.map((sample) => (
        <section key={`${sample.language}-${sample.text}`} className="rounded-[26px] bg-white p-5 ring-1 ring-black/[0.06]">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-faint">{sample.language}</p>
          <p className="mt-1 text-[1.75rem] font-semibold" lang={sample.language}>{sample.text}</p>
          <OtherReadings
            className="mt-2.5"
            text={sample.text}
            language={sample.language}
            partOfSpeech={sample.partOfSpeech}
            ipa={sample.ipa}
          />
        </section>
      ))}
    </main>
  );
}
