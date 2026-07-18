import SectionCard from "@/components/design/SectionCard";
import type { VocabularyItem } from "./types";

type VocabularyExampleProps = {
  item: VocabularyItem;
};

export default function VocabularyExample({
  item,
}: VocabularyExampleProps) {
  return (
    <SectionCard title="Example">
      <p className="text-lg leading-8 text-neutral-950">
        {item.example_sentence ||
          "No example sentence yet."}
      </p>

      {item.translated_example ? (
        <p className="mt-3 leading-7 text-neutral-500">
          {item.translated_example}
        </p>
      ) : null}
    </SectionCard>
  );
}
