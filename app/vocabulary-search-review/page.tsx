import VocabularySearchReview from "@/components/vocabulary/VocabularySearchReview";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The vocabulary search field, without an account. A development surface
 * beside /brand-review, /launch-review and /tutorial-review.
 */
export const metadata = {
  title: "Vocabulary search review",
  robots: { index: false, follow: false },
};

export default async function VocabularySearchReviewPage() {
  reviewRouteOnly();

  const storedMode = await getServerInterfaceMode();

  return <VocabularySearchReview storedMode={storedMode} />;
}
