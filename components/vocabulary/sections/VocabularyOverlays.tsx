"use client";

import type { ComponentProps } from "react";

import CollectionPickerSheet from "@/components/vocabulary/CollectionPickerSheet";
import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import VocabularyDetailSheet from "@/components/vocabulary/VocabularyDetailSheet";
import VocabularyEditModal from "@/components/vocabulary/detail/VocabularyEditModal";
import VocabularyLookupModal from "@/components/vocabulary/modals/VocabularyLookupModal";
import SortBottomSheet from "@/components/vocabulary/SortBottomSheet";
import VocabularyFilterPanel from "@/components/vocabulary/VocabularyFilterPanel";
import type { VocabularyItem } from "@/lib/types/app";

type VocabularyOverlaysProps = {
  lookupProps: ComponentProps<typeof VocabularyLookupModal>;

  sortOpen: boolean;
  sortProps: ComponentProps<typeof SortBottomSheet>;

  filtersOpen: boolean;
  filterProps: ComponentProps<typeof VocabularyFilterPanel>;

  friendPickerOpen: boolean;
  friendPickerProps: ComponentProps<typeof FriendPickerModal>;

  detailItem: VocabularyItem | null;
  detailProps: Omit<ComponentProps<typeof VocabularyDetailSheet>, "item" | "open">;

  collectionsItem: VocabularyItem | null;
  onCloseCollections: () => void;

  editItem: VocabularyItem | null;
  editProps: ComponentProps<typeof VocabularyEditModal> | null;
};

export default function VocabularyOverlays({
  lookupProps,
  sortOpen,
  sortProps,
  filtersOpen,
  filterProps,
  friendPickerOpen,
  friendPickerProps,
  detailItem,
  detailProps,
  collectionsItem,
  onCloseCollections,
  editItem,
  editProps,
}: VocabularyOverlaysProps) {
  return (
    <>
      <VocabularyLookupModal {...lookupProps} />

      {sortOpen && <SortBottomSheet {...sortProps} />}

      {filtersOpen && <VocabularyFilterPanel {...filterProps} />}

      {friendPickerOpen && <FriendPickerModal {...friendPickerProps} />}

      {detailItem && (
        <VocabularyDetailSheet item={detailItem} open {...detailProps} />
      )}

      {collectionsItem && (
        <CollectionPickerSheet
          item={collectionsItem}
          onClose={onCloseCollections}
        />
      )}

      {editItem && editProps && <VocabularyEditModal {...editProps} />}
    </>
  );
}
