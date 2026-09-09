import ActiveLaunch from "@/components/launch/activeLaunch";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The opening, with a scrubber and phase checkpoints. Kept as a real route
 * rather than a Storybook-style harness because the thing worth reviewing is
 * how it behaves on the actual phone, over a Vercel Preview URL.
 */
export const metadata = {
  title: "Launch review",
  robots: { index: false, follow: false },
};

export default function LaunchReviewPage() {
  reviewRouteOnly();

  return (
    <main>
      <ActiveLaunch reviewMode />
    </main>
  );
}
