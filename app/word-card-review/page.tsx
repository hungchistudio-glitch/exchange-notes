import WordCardReview from "@/components/messages/WordCardReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Word cards as they arrive in a conversation, signed out: a word, a long
 * sentence (Chi, 2026-10-24: one was cut to a line with no way to read the
 * rest), and a long sentence led in Chinese. A development surface beside
 * /vocabulary-card-review, since the conversation itself needs an account.
 */
export const metadata = {
  title: "Word card review",
  robots: { index: false, follow: false },
};

export default function WordCardReviewPage() {
  reviewRouteOnly();

  return <WordCardReview />;
}
