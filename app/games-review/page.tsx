import GamesHubReview from "@/components/games/GamesHubReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/* The games hub without an account, in front of the two games' review
   screens (app/hangyumi-review, ?game=wordvault). */
export const metadata = {
  title: "Games review",
  robots: { index: false, follow: false },
};

export default function GamesReviewPage() {
  reviewRouteOnly();
  return <GamesHubReview />;
}
