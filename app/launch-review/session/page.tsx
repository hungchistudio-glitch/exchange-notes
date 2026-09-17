import LaunchSessionReview from "@/components/launch/LaunchSessionReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Launch session review",
  robots: { index: false, follow: false },
};

export default function LaunchSessionReviewPage() {
  reviewRouteOnly();

  return <LaunchSessionReview />;
}
