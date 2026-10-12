import YumiShopReview from "@/components/shop/YumiShopReview";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The shop without an account, for looking at it on a phone against a
 * preview deployment. The wallet is in memory and starts at 240 cookies;
 * nothing here reads or writes anybody's cookies or outfit.
 */
export const metadata = {
  title: "Yumi shop review",
  robots: { index: false, follow: false },
};

export default async function YumiShopReviewPage() {
  reviewRouteOnly();
  const storedMode = await getServerInterfaceMode();
  return <YumiShopReview startCosmic={storedMode === "yumi-cosmic"} />;
}
