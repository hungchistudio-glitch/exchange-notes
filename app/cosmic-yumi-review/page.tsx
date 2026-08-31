import CosmicYumiReview from "@/components/cosmic/CosmicYumiReview";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Yumi on the Command Deck, without an account.
 *
 * A development surface beside /brand-review, /launch-review and
 * /tutorial-review. The deck is otherwise behind sign-in, which made the one
 * thing Cosmic Mode is judged on — whether the character reads as alive — the
 * one thing that could not be looked at without a session.
 *
 * The real interface mode is read here and handed down untouched; see
 * CosmicYumiReview for why a review page must not invent one.
 */
export const metadata = {
  title: "Cosmic Yumi review",
  robots: { index: false, follow: false },
};

export default async function CosmicYumiReviewPage() {
  reviewRouteOnly();

  const storedMode = await getServerInterfaceMode();

  return <CosmicYumiReview storedMode={storedMode} />;
}
