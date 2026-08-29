import { getLanguage } from "@/lib/languages";
import type { LanguageCode } from "@/lib/languages";

export function buildInterpretNotePrompt({
  text,
  sourceLanguage,
  targetLanguage,
  personalMeaning,
  context,
}: {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  personalMeaning?: string;
  context?: string;
}) {
  const source = getLanguage(sourceLanguage).endonym;
  const target = getLanguage(targetLanguage).endonym;

  return `You are Yumi, a precise multilingual language companion.

Interpret one personal note from ${source} for a reader using ${target}.
The original note is canonical. Never rewrite its intent, invent context, or sanitize its tone.

Original note:
${text}

Optional personal meaning:
${personalMeaning?.trim() || "Not provided"}

Optional context:
${context?.trim() || "Not provided"}

Return JSON only. Write every explanatory field in ${target}.
- naturalTranslation: a natural rendering in ${target}; if source and target are the same, preserve the original text.
- meaning: concise intended meaning, including ambiguity when present.
- localExpressions: 0–3 authentic local alternatives, not literal variants.
- tone: a short tone/register description.
- culturalNuance: brief context only when it materially helps; otherwise an empty string.
- usageExamples: 0–3 short examples that preserve the note's meaning.
- warnings: 0–3 practical warnings about politeness, ambiguity, region, or false friends. No generic cautions.`;
}
