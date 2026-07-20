import { memo, type ComponentProps } from "react";

import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

type CardInteraction = Parameters<
  NonNullable<ComponentProps<typeof VocabularyCard>["onInteract"]>
>[1];

type VocabularySavedListStateProps = {
  items: VocabularyItem[];
  updatingId: string | null;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void | Promise<void>;
  onSendToPartner: (item: VocabularyItem) => void;
  onInteract: (
    item: VocabularyItem,
    type: CardInteraction,
  ) => void;
};

function VocabularySavedListState({
  items,
  updatingId,
  onChangeStatus,
  onSendToPartner,
  onInteract,
}: VocabularySavedListStateProps) {
  return (
    <section
      aria-label="Saved vocabulary"
      className="mt-6 space-y-4"
    >
      {items.map((item) => (
        <VocabularyCard
          key={item.id}
          item={item}
          updating={updatingId === item.id}
          onChangeStatus={onChangeStatus}
          onSendToPartner={onSendToPartner}
          onInteract={onInteract}
        />
      ))}
    </section>
  );
}

export default memo(VocabularySavedListState);
