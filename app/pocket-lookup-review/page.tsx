import PocketLookupReview from "@/components/pocket/PocketLookupReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/* Yumi Pocket Lookup without an account: see PocketLookupReview. */
export const metadata = {
  title: "Yumi Pocket Lookup review",
  robots: { index: false, follow: false },
};

export default function PocketLookupReviewPage() {
  reviewRouteOnly();
  return <PocketLookupReview />;
}
