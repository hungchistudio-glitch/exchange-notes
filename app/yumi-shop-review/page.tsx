import YumiShopReview from "@/components/shop/YumiShopReview";
import { SCENE_CHOICES, type SceneChoice } from "@/lib/shop/atmosphere";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The shop without an account, for looking at it on a phone against a
 * preview deployment. The wallet is in memory and starts at 240 cookies;
 * nothing here reads or writes anybody's cookies or outfit.
 *
 * ?sky=rain (or clear, snow, leaves, butterflies, stars) opens it under that
 * sky, and ?mode=cosmic in Cosmic, so each can be looked at by link.
 */
export const metadata = {
  title: "Yumi shop review",
  robots: { index: false, follow: false },
};

export default async function YumiShopReviewPage({ searchParams }: {
  searchParams: Promise<{ sky?: string; mode?: string }>;
}) {
  reviewRouteOnly();
  const [storedMode, params] = await Promise.all([getServerInterfaceMode(), searchParams]);
  const sky = SCENE_CHOICES.includes(params.sky as SceneChoice) ? (params.sky as SceneChoice) : null;
  const cosmic = params.mode ? params.mode === "cosmic" : storedMode === "yumi-cosmic";
  return <YumiShopReview startCosmic={cosmic} sky={sky} />;
}
