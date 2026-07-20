"use client";

import type { ComponentProps } from "react";

import FriendPickerModal from "@/components/vocabulary/FriendPickerModal";
import VocabularyLookupModal from "@/components/vocabulary/modals/VocabularyLookupModal";
import SortBottomSheet from "@/components/vocabulary/SortBottomSheet";
import VocabularyFilterPanel from "@/components/vocabulary/VocabularyFilterPanel";

type VocabularyOverlaysProps = {
  lookupProps: ComponentProps<typeof VocabularyLookupModal>;

  sortOpen: boolean;
  sortProps: ComponentProps<typeof SortBottomSheet>;

  filtersOpen: boolean;
  filterProps: ComponentProps<typeof VocabularyFilterPanel>;

  friendPickerOpen: boolean;
  friendPickerProps: ComponentProps<typeof FriendPickerModal>;
};

export default function VocabularyOverlays({
  lookupProps,
  sortOpen,
  sortProps,
  filtersOpen,
  filterProps,
  friendPickerOpen,
  friendPickerProps,
}: VocabularyOverlaysProps) {
  return (
    <>
      <VocabularyLookupModal {...lookupProps} />

      {sortOpen && <SortBottomSheet {...sortProps} />}

      {filtersOpen && <VocabularyFilterPanel {...filterProps} />}

      {friendPickerOpen && <FriendPickerModal {...friendPickerProps} />}
    </>
  );
}
