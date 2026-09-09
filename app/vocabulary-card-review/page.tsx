import VocabularyCardReview from "@/components/vocabulary/VocabularyCardReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The word cards on their own, signed out. A development surface beside
 * /vocabulary-search-review and /share-sheet-review.
 *
 * A real route rather than a harness because what goes wrong with these cards
 * goes wrong under a finger: a tap that has to be made twice, a swipe that
 * will not open, a phrase that cannot be selected. None of it reproduces with
 * a mouse, so it has to be openable on a phone or a simulator.
 */
export const metadata = {
  title: "Vocabulary card review",
  robots: { index: false, follow: false },
};

export default function VocabularyCardReviewPage() {
  reviewRouteOnly();

  return <VocabularyCardReview />;
}
