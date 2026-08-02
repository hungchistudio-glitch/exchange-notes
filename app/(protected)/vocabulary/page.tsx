"use client";

import dynamic from "next/dynamic";

import DashboardSheet from "@/components/dashboard/DashboardSheet";
import AppPage from "@/components/ui/AppPage";
import VocabularyHero from "@/components/vocabulary/VocabularyHero";
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
  const { heroProps, mainContentProps, overlaysProps } = useVocabularyPage();

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
      <DashboardSheet>
        <VocabularyHero {...heroProps} />
      </DashboardSheet>

      <VocabularyMainContent {...mainContentProps} />

      {hasOpenOverlay ? <VocabularyOverlays {...overlaysProps} /> : null}
    </AppPage>
  );
}
