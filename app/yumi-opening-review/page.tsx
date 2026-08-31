import YumiMinimalLaunch from "@/components/launch/YumiMinimalLaunch";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Yumi minimal opening review — Exchange Notes",
  robots: { index: false, follow: false },
};

/**
 * The active renderer with its extra timeline and sound controls kept out of
 * the signed-in SplashGate.
 */
export default function YumiOpeningReviewPage() {
  reviewRouteOnly();

  return (
    <main>
      <YumiMinimalLaunch
        launchId="yumi-minimal-v1-review"
        reviewMode
        showHandoffPreview
      />
    </main>
  );
}
