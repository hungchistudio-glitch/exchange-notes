import TutorialReview from "@/components/tutorial/TutorialReview";

/*
 * The tour, openable without an account and at any interface language.
 *
 * A development surface, not a product one — unlinked, noindex, and it renders
 * nothing an account owns. It sits beside /brand-review and /launch-review,
 * which exist for the same reason: the thing worth reviewing here is whether
 * eleven slides of translated copy still fit their frames on a 320px phone,
 * and that is a question you answer by looking at all five languages, not by
 * trusting that they were checked once in English.
 */
export const metadata = {
  title: "Tutorial review",
  robots: { index: false, follow: false },
};

export default function TutorialReviewPage() {
  return <TutorialReview />;
}
