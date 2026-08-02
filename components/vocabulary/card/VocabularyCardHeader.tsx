"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import VocabularyWord from "@/components/vocabulary/ui/VocabularyWord";
import VocabularyTranslation from "@/components/vocabulary/ui/VocabularyTranslation";
import useTranslation from "@/hooks/i18n/useTranslation";

import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

type Props = {
  item: VocabularyItem;
};

type PartOfSpeechKey =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "phrase"
  | "other";

function normalizePartOfSpeech(
  value: string,
): PartOfSpeechKey {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, PartOfSpeechKey> = {
    noun: "noun",
    verb: "verb",
    adjective: "adjective",
    adj: "adjective",
    adverb: "adverb",
    adv: "adverb",
    pronoun: "pronoun",
    preposition: "preposition",
    conjunction: "conjunction",
    interjection: "interjection",
    phrase: "phrase",
  };

  return aliases[normalized] ?? "other";
}

export default function VocabularyCardHeader({
  item,
}: Props) {
  const { t } = useTranslation();
  const search = t.vocabulary.search;
  const detail = t.vocabulary.detail;

  const statusLabels: Record<VocabularyStatus, string> = {
    new: search.statuses.new,
    learning: search.statuses.learning,
    mastered: search.statuses.mastered,
  };

  const translation = item.translation?.trim() || "";

  const partOfSpeechLabel = item.part_of_speech?.trim()
    ? detail.partOfSpeech[
        normalizePartOfSpeech(item.part_of_speech)
      ]
    : null;

  return (
    <header className="min-w-0">
      <div className="space-y-1.5">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-black/45">
          {statusLabels[item.status]}
        </p>

        {partOfSpeechLabel ? (
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-black/30">
            {partOfSpeechLabel}
          </p>
        ) : null}
      </div>

      <VocabularyWord
        word={item.word}
        className="mt-6"
      />

      <PronunciationBlock
        english={item.word}
        chinese={translation}
        showEnglish
        className="mt-4"
      />

      {translation ? (
        <VocabularyTranslation
          text={translation}
          className="mt-5 border-t border-black/[0.06] pt-5"
        />
      ) : null}
    </header>
  );
}
