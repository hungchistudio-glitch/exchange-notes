import VoiceTranslationReview from "@/components/lexicon/VoiceTranslationReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The microphone and the sentence card, without an account. A development
 * surface beside /vocabulary-search-review; ?mode=cosmic shows the console.
 */
export const metadata = {
  title: "Voice translation review",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  reviewRouteOnly();
  return <VoiceTranslationReview cosmic={(await searchParams).mode === "cosmic"} />;
}
