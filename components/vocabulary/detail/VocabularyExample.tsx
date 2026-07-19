import SectionCard from "@/components/design/SectionCard";
import VocabularyExampleBlock from "@/components/vocabulary/ui/VocabularyExampleBlock";
import type { VocabularyItem } from "./types";

type VocabularyExampleProps = {
  item: VocabularyItem;
};

export default function VocabularyExample({
  item,
}: VocabularyExampleProps) {
  return (
    <SectionCard title="Example">
      <VocabularyExampleBlock
        english={item.example_sentence}
        chinese={item.translated_example}
      />
    </SectionCard>
  );
}
