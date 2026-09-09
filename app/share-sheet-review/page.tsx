import ShareSheetReview from "@/components/vocabulary/ShareSheetReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The "which friend?" sheet arriving, without an account. A development
 * surface beside /vocabulary-search-review, /brand-review and /launch-review.
 *
 * A real route rather than a harness for the same reason as the launch
 * animation next door: what is worth reviewing here is how the sheet moves on
 * an actual phone, which means opening it on one over a Preview URL.
 */
export const metadata = {
  title: "Share sheet review",
  robots: { index: false, follow: false },
};

export default function ShareSheetReviewPage() {
  reviewRouteOnly();

  return <ShareSheetReview />;
}
