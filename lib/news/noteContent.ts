import { loadTranslations } from "@/lib/i18n";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { interfaceLanguageForCode, type LanguageCode } from "@/lib/languages";
import type { DailyNewsCard } from "@/lib/types/dailyNews";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";

/*
 * A note keeps both sides of the card, in the reader's own pair. The two
 * halves were called "english" and "chinese" and now are not: whichever
 * language leads is the first, and the language they already have is the
 * second.
 *
 * Each half is headed in its own language. They said "Vocabulary" and
 * "Source:" over the first half and 學習單字 over the second whatever the
 * pair was, so a French reader learning Spanish saved a Spanish half headed
 * in English and a French half headed in Chinese.
 */
export type NoteLabels = {
  vocabulary: string;
  source: string;
  partOfSpeech: TranslationDictionary["vocabulary"]["detail"]["partOfSpeech"];
  colon: string;
};

/** How each language puts a label before its value. */
const LABEL_COLON: Record<LanguageCode, string> = {
  en: ": ",
  "zh-TW": "：",
  es: ": ",
  fr: " : ",
  it: ": ",
};

/**
 * The headings for one half, from that language's dictionary.
 *
 * Fetched when the story is saved rather than at render: the reader may be
 * learning a language the interface is not in, and a dictionary is a chunk
 * of its own. A language with no dictionary, or one that will not load,
 * falls back to the interface's own words rather than losing the save.
 */
export async function noteLabelsFor(
  language: LanguageCode,
  fallback: TranslationDictionary,
): Promise<NoteLabels> {
  const interfaceLanguage = interfaceLanguageForCode(language);
  let dictionary = fallback;

  if (interfaceLanguage) {
    try {
      dictionary = await loadTranslations(interfaceLanguage);
    } catch (error) {
      console.error("Could not load the note headings:", error);
    }
  }

  return {
    vocabulary: dictionary.messages.newsCardVocabulary,
    source: dictionary.common.source,
    partOfSpeech: dictionary.vocabulary.detail.partOfSpeech,
    colon: LABEL_COLON[language],
  };
}

/** "(noun)", in the half's language, lower-cased mid-line as it was. */
function partOfSpeechLabel(
  value: string,
  labels: NoteLabels,
  language: LanguageCode,
) {
  if (!value.trim()) return "";

  const key = normalizePartOfSpeech(value);
  return key === "other"
    ? ""
    : labels.partOfSpeech[key].toLocaleLowerCase(language);
}

export function createNoteContent(
  card: DailyNewsCard,
  [primaryLanguage, secondaryLanguage]: readonly [LanguageCode, LanguageCode],
  [primaryLabels, secondaryLabels]: readonly [NoteLabels, NoteLabels],
) {
  const primaryVocabulary = card.vocabulary
    .map((item) => {
      const partOfSpeech = partOfSpeechLabel(
        item.partOfSpeech,
        primaryLabels,
        primaryLanguage,
      );

      return `• ${item.texts[primaryLanguage] ?? ""}${partOfSpeech ? ` (${partOfSpeech})` : ""} — ${item.examples[primaryLanguage] ?? ""}`;
    })
    .join("\n");

  const secondaryVocabulary = card.vocabulary
    .map(
      (item) =>
        `• ${item.texts[primaryLanguage] ?? ""}${secondaryLabels.colon}${item.texts[secondaryLanguage] ?? ""}\n  ${item.examples[secondaryLanguage] ?? ""}`,
    )
    .join("\n");

  const primary = `📰 ${(card.titles[primaryLanguage] ?? "")}

${(card.summaries[primaryLanguage] ?? "")}

${primaryLabels.vocabulary}
${primaryVocabulary}

${primaryLabels.source}${primaryLabels.colon}${card.sourceName}
${card.sourceUrl}`;

  const secondary = `${(card.titles[secondaryLanguage] ?? "")}

${(card.summaries[secondaryLanguage] ?? "")}

${secondaryLabels.vocabulary}
${secondaryVocabulary}`;

  return { primary, secondary };
}
