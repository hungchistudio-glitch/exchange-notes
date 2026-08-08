"use client";

import { memo, useCallback, useEffect } from "react";

import { Card } from "@/components/foundation-legacy";
import VocabularySelection from "@/components/vocabulary/VocabularySelection";
import VocabularyCardHeader from "@/components/vocabulary/card/VocabularyCardHeader";
import VocabularyCardActions from "@/components/vocabulary/card/VocabularyCardActions";
import VocabularyCardDetails from "@/components/vocabulary/card/VocabularyCardDetails";
import VocabularyCompactHeader from "@/components/vocabulary/card/VocabularyCompactHeader";
import useTranslation from "@/hooks/i18n/useTranslation";

import type { InteractionType } from "@/lib/vocabulary/helpers";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";
import type { VocabularyViewMode } from "@/lib/vocabulary/viewMode";

import styles from "./VocabularyCard.module.css";

type VocabularyCardProps = {
  item: VocabularyItem;
  updating: boolean;
  expanded: boolean;
  viewMode: VocabularyViewMode;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void | Promise<void>;
  onSendToPartner: (item: VocabularyItem) => void;
  onOpenDetail: (item: VocabularyItem) => void;
  onToggleExpanded: (item: VocabularyItem) => void;
  onInteract: (
    item: VocabularyItem,
    type: InteractionType,
  ) => void;
};

function VocabularyCard({
  item,
  updating,
  expanded,
  viewMode,
  onChangeStatus,
  onSendToPartner,
  onOpenDetail,
  onToggleExpanded,
  onInteract,
}: VocabularyCardProps) {
  const { t } = useTranslation();
  useEffect(() => {
    onInteract(item, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const toggleDetails = useCallback(() => {
    onInteract(item, "view");
    onToggleExpanded(item);
  }, [item, onInteract, onToggleExpanded]);

  const openDetailSheet = useCallback(() => {
    onInteract(item, "view");
    onOpenDetail(item);
  }, [item, onInteract, onOpenDetail]);

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
    <div className="relative" id={`vocabulary-card-${item.id}`}>
      <VocabularySelection
        item={item}
        onSendToPartner={onSendToPartner}
      >
        <Card
          interactive
          padding="none"
          className={`overflow-hidden ${viewMode === "compact" ? "rounded-[18px]" : ""}`}
        >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={(expanded
            ? t.vocabulary.detail.collapseDetailsAriaLabel
            : t.vocabulary.detail.expandDetailsAriaLabel
          ).replace("{word}", item.word)}
          onClick={toggleDetails}
          onKeyDown={(event) => {
            if (event.currentTarget !== event.target) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleDetails();
            }
          }}
          className="group block w-full cursor-pointer text-left transition active:scale-[0.995]"
        >
          {viewMode === "cards" && item.image_url && (
            <div
              className="aspect-[16/9] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${item.image_url})` }}
              role="img"
              aria-label={item.word}
            />
          )}

          {viewMode === "cards" ? (
            <div className="px-5 py-5">
              <VocabularyCardHeader item={item} />
            </div>
          ) : (
            <VocabularyCompactHeader item={item} />
          )}
        </div>

        <div
          className={styles.detailsGrid}
          data-expanded={expanded}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div className={styles.detailsInner}>
            <VocabularyCardDetails item={item} />
            <VocabularyCardActions
              mastered={item.status === "mastered"}
              updating={updating}
              onToggleMastered={handleToggleMastered}
              onSend={handleSendToPartner}
              onOpen={openDetailSheet}
              word={item.word}
            />
          </div>
        </div>
        </Card>
      </VocabularySelection>

    </div>
  );
}

export default memo(VocabularyCard);
