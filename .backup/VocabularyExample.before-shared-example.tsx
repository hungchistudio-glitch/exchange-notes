import SectionCard from "@/components/design/SectionCard";
import VocabularySpeechButton from "@/components/vocabulary/ui/VocabularySpeechButton";
import type { VocabularyItem } from "./types";

type VocabularyExampleProps = {
  item: VocabularyItem;
};

export default function VocabularyExample({
  item,
}: VocabularyExampleProps) {
  const englishExample =
    item.example_sentence?.trim() || "";
  const chineseExample =
    item.translated_example?.trim() || "";

  return (
    <SectionCard title="Example">
      {englishExample ? (
        <div className="flex items-start justify-between gap-4">
          <p className="min-w-0 flex-1 text-[16px] font-medium leading-7 text-neutral-950">
            {englishExample}
          </p>

          <VocabularySpeechButton
            text={englishExample}
            language="en-US"
            label="Play English example"
            size="sm"
          />
        </div>
      ) : (
        <p className="text-[15px] leading-7 text-neutral-500">
          No example sentence yet.
        </p>
      )}

      {chineseExample ? (
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-black/[0.06] pt-4">
          <p className="min-w-0 flex-1 text-[15px] leading-7 text-neutral-500">
            {chineseExample}
          </p>

          <VocabularySpeechButton
            text={chineseExample}
            language="zh-TW"
            label="播放中文例句"
            size="sm"
          />
        </div>
      ) : null}
    </SectionCard>
  );
}
