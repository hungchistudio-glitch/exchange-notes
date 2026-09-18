import CosmicSettingsReview from "@/components/cosmic/CosmicSettingsReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Cosmic settings review",
  robots: { index: false, follow: false },
};

export default function CosmicSettingsReviewPage() {
  reviewRouteOnly();
  return <CosmicSettingsReview />;
}
