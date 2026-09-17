import ActiveLaunch from "@/components/launch/activeLaunch";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Yumi Prism opening review — Exchange Notes",
  robots: { index: false, follow: false },
};

/**
 * The active renderer with its extra timeline controls kept out of
 * the signed-in SplashGate.
 */
export default function YumiOpeningReviewPage() {
  reviewRouteOnly();

  return (
    <main>
      <ActiveLaunch reviewMode />
    </main>
  );
}
