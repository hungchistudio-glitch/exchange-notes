"use client";

import SectionCard from "@/components/vocabulary/detail/VocabularySection";
import VocabularyExampleBlock from "@/components/vocabulary/ui/VocabularyExampleBlock";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyItem } from "./types";

type VocabularyExampleProps = {
  item: VocabularyItem;
};

export default function VocabularyExample({
  item,
}: VocabularyExampleProps) {
  const { t } = useTranslation();
  const detail = t.vocabulary.detail;

  return (
    <SectionCard title={detail.example}>
      <VocabularyExampleBlock
        english={item.example_sentence}
        chinese={item.translated_example}
      />
    </SectionCard>
  );
}
