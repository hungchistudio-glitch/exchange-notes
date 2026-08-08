"use client";

import dynamic from "next/dynamic";
import { use } from "react";

import AppPage from "@/components/ui/AppPage";
import YumiCompanion from "@/components/vocabulary/pet/YumiCompanion";
import VocabularyMainContent from "@/components/vocabulary/sections/VocabularyMainContent";
import useVocabularyPage from "@/hooks/pages/useVocabularyPage";

const VocabularyOverlays = dynamic(
  () => import("@/components/vocabulary/sections/VocabularyOverlays"),
  {
    ssr: false,
    loading: () => null,
  },
);

type VocabularyPageProps = {
  searchParams: Promise<{
    widgetAction?: string | string[];
    widgetWordId?: string | string[];
    widgetNonce?: string | string[];
  }>;
};

export default function VocabularyPage({ searchParams }: VocabularyPageProps) {
  const { widgetAction, widgetWordId, widgetNonce } = use(searchParams);
  const normalizedWidgetAction = Array.isArray(widgetAction)
    ? widgetAction[0]
    : widgetAction;
  const normalizedWidgetWordId = Array.isArray(widgetWordId)
    ? widgetWordId[0]
    : widgetWordId;
  const addWordRequestId = Array.isArray(widgetNonce)
    ? widgetNonce[0]
    : widgetNonce;
  const openAddWord = normalizedWidgetAction === "add-word";
  const openWidgetWordId =
    normalizedWidgetAction === "open-word"
      ? normalizedWidgetWordId
      : undefined;

  const { yumiProps, mainContentProps, overlaysProps } = useVocabularyPage({
    openAddWord,
    addWordRequestId,
    openWidgetWordId,
    openWidgetWordRequestId: addWordRequestId,
  });

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
      <YumiCompanion {...yumiProps} />

      <VocabularyMainContent {...mainContentProps} />

      {hasOpenOverlay ? <VocabularyOverlays {...overlaysProps} /> : null}
    </AppPage>
  );
}
