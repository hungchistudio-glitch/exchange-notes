"use client";

import DashboardSheet from "@/components/dashboard/DashboardSheet";
import AppPage from "@/components/ui/AppPage";
import VocabularyHero from "@/components/vocabulary/VocabularyHero";
import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import VocabularyOverlays from "@/components/vocabulary/sections/VocabularyOverlays";
import useVocabularyPage from "@/hooks/pages/useVocabularyPage";

export default function VocabularyPage() {
  const {
    heroProps,
    mainContentProps,
    overlaysProps,
  } = useVocabularyPage();

  return (
    <AppPage width="default">
      <DashboardSheet>
        <VocabularyHero {...heroProps} />
      </DashboardSheet>

      <VocabularyMainContent {...mainContentProps} />

      <VocabularyOverlays {...overlaysProps} />
    </AppPage>
  );
}
