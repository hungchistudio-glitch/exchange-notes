import type { ShopStageLabels } from "@/components/shop/ShopStage";
import Proposal333Review from "@/components/shop/proposals/Proposal333Review";
import type { InterfaceLanguage } from "@/lib/appPreferences";
import { loadTranslations } from "@/lib/i18n";
import { INTERFACE_LANGUAGE_CODE } from "@/lib/languages";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Station 33 · 333: the 113 proposed pieces and the ten wearable samples
 * (components/shop/proposals/Proposal333Review.tsx). A design review on a
 * development machine or a preview build only; nothing here is for sale.
 *
 * The page switches its own language, so the stage's labels are loaded for
 * all five up front.
 */
export const metadata = {
  title: "Station 33 · 333-piece design review",
  robots: { index: false, follow: false },
};

export default async function Proposal333ReviewPage() {
  reviewRouteOnly();
  const languages = Object.keys(INTERFACE_LANGUAGE_CODE) as InterfaceLanguage[];
  const entries = await Promise.all(
    languages.map(async (language) => {
      const { shop } = await loadTranslations(language);
      const labels: ShopStageLabels = {
        stage: shop.stage,
        hint: shop.hint,
        views: shop.views,
        front: shop.front,
        side: shop.side,
        back: shop.backView,
        resetView: shop.resetView,
        zoomIn: shop.zoomIn,
        zoomOut: shop.zoomOut,
        unavailable: shop.stageUnavailable,
      };
      return [language, labels] as const;
    }),
  );
  return <Proposal333Review stageLabels={Object.fromEntries(entries) as Record<InterfaceLanguage, ShopStageLabels>} />;
}
