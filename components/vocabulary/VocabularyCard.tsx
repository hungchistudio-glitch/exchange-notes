"use client";

import { memo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

import VocabularySelection from "@/components/vocabulary/VocabularySelection";
import VocabularyCardHeader from "@/components/vocabulary/card/VocabularyCardHeader";
import VocabularyCardActions from "@/components/vocabulary/card/VocabularyCardActions";
import VocabularyExampleBlock from "@/components/vocabulary/ui/VocabularyExampleBlock";

import type { InteractionType } from "@/lib/vocabulary/helpers";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

type VocabularyCardProps = {
  item: VocabularyItem;
  updating: boolean;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void | Promise<void>;
  onSendToPartner: (item: VocabularyItem) => void;
  onInteract: (
    item: VocabularyItem,
    type: InteractionType,
  ) => void;
};

function VocabularyCard({
  item,
  updating,
  onChangeStatus,
  onSendToPartner,
  onInteract,
}: VocabularyCardProps) {
  const router = useRouter();
  useEffect(() => {
    onInteract(item, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const openDetails = useCallback(() => {
    onInteract(item, "view");
    router.push(`/vocabulary/${item.id}`);
  }, [item, onInteract, router]);

  const handleToggleMastered = useCallback(() => {
    void onChangeStatus(
      item,
      item.status === "mastered" ? "learning" : "mastered",
    );
  }, [item, onChangeStatus]);

  const handleSendToPartner = useCallback(() => {
    onSendToPartner(item);
  }, [item, onSendToPartner]);

  return (
    <div className="relative">
      <VocabularySelection
        item={item}
        onSendToPartner={onSendToPartner}
      >
        <article className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white shadow-[0_12px_42px_rgba(15,23,42,.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-black/[0.11] hover:shadow-[0_22px_60px_rgba(15,23,42,.09)]">
        <div
          onClick={openDetails}
          className="group block w-full cursor-pointer text-left transition active:scale-[0.995]"
        >
          {item.image_url && (
            <div
              className="aspect-[16/8] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${item.image_url})` }}
              role="img"
              aria-label={item.word}
            />
          )}

          <div className="px-6 py-6">
            <VocabularyCardHeader item={item} />

            <VocabularyExampleBlock
              english={item.example_sentence}
              chinese={item.translated_example}
              className="mt-7"
            />
          </div>
        </div>

        <VocabularyCardActions
          mastered={item.status === "mastered"}
          updating={updating}
          onToggleMastered={handleToggleMastered}
          onSend={handleSendToPartner}
          onOpen={openDetails}
        />
        </article>
      </VocabularySelection>

    </div>
  );
}

export default memo(VocabularyCard);
