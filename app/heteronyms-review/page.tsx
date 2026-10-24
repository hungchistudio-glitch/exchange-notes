import HeteronymsReview from "@/components/pronunciation/HeteronymsReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * A headword's other readings, without an account: sample words in each
 * language, as a search result shows them. Readings that need the
 * phonetics route (which needs a sign-in) — the "used here" mark on a
 * Chinese word — do not appear here; everything else does.
 */
export const metadata = {
  title: "Heteronyms review",
  robots: { index: false, follow: false },
};

export default function HeteronymsReviewPage() {
  reviewRouteOnly();
  return <HeteronymsReview />;
}
