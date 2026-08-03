"use client";

import dynamic from "next/dynamic";

import AppPage from "@/components/ui/AppPage";
import MurphCompanion from "@/components/vocabulary/pet/MurphCompanion";
import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import useVocabularyPage from "@/hooks/pages/useVocabularyPage";

const VocabularyOverlays = dynamic(
  () => import("@/components/vocabulary/sections/VocabularyOverlays"),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function VocabularyPage() {
  const { murphProps, mainContentProps, overlaysProps } = useVocabularyPage();

  const hasOpenOverlay =
    overlaysProps.lookupProps.open ||
    overlaysProps.sortOpen ||
    overlaysProps.filtersOpen ||
    overlaysProps.friendPickerOpen ||
    Boolean(overlaysProps.detailItem) ||
    Boolean(overlaysProps.collectionsItem) ||
    Boolean(overlaysProps.editItem);

  return (
    <AppPage width="default">
      <MurphCompanion {...murphProps} />

      <VocabularyMainContent {...mainContentProps} />

      {hasOpenOverlay ? <VocabularyOverlays {...overlaysProps} /> : null}
    </AppPage>
  );
}
