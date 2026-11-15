"use client";

import dynamic from "next/dynamic";
import { use } from "react";

import PageTitle from "@/components/foundation/layout/PageTitle";
import AppPage from "@/components/ui/AppPage";
import useTranslation from "@/hooks/i18n/useTranslation";
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
  const { t } = useTranslation();
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

  /*
   * `overlaysOpen` comes from the hook that builds the props rather than
   * being re-derived here. The overlay tree is loaded on demand, so whatever
   * decides to mount it has to know about every overlay in it — and a list
   * kept in a different file from the props it describes is a list that goes
   * out of date silently. See useVocabularyPage.
   */
  const { yumiProps, mainContentProps, overlaysProps, overlaysOpen } =
    useVocabularyPage({
      openAddWord,
      addWordRequestId,
      openWidgetWordId,
      openWidgetWordRequestId: addWordRequestId,
    });

  return (
    <AppPage width="default">
      {/* The title every page wears, above Yumi's halo (Chi, 2026-11-15:
          單字庫加標題). The page's column is 21px in, and so is the title. */}
      <div className="px-[21px]">
        <PageTitle flush eyebrow={t.navigation.vocabulary} title={t.vocabulary.hero.library} />
      </div>

      <YumiCompanion {...yumiProps} />

      <VocabularyMainContent {...mainContentProps} />

      {overlaysOpen ? <VocabularyOverlays {...overlaysProps} /> : null}
    </AppPage>
  );
}
