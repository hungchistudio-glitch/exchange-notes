import HangyumiWordReview from "@/components/hangyumi/HangyumiWordReview";

export const metadata = { title: "Hangyumi word bank", robots: { index: false, follow: false } };

/* Open to every signed-in reader as a route, but the bank is only ever
   sent to a word reviewer: hangyumi_review_words refuses anyone else. */
export default function Page() {
  return <HangyumiWordReview />;
}
