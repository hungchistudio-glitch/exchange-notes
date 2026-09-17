import YumiPrismLaunch from "@/components/launch/YumiPrismLaunch";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Yumi Prism opening — clean review",
  robots: { index: false, follow: false },
};

/** Real compositor playback, without the review tool's JavaScript clock. */
export default function CleanYumiOpeningReviewPage() {
  reviewRouteOnly();

  return (
    <main>
      <YumiPrismLaunch
        launchId="yumi-prism-v1-clean"
        showHandoffPreview
        showReviewControls={false}
      />
    </main>
  );
}
