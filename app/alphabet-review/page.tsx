import { HangulChart, KanaChart } from "@/components/pronunciation/lab/AlphabetModule";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The Lab's kana and Hangul charts without an account (?lang=ko for
 * Hangul), on a development machine or a preview build only. The Lab
 * itself needs a sign-in for its progress; the charts need nothing.
 */
export const metadata = {
  title: "Alphabet review",
  robots: { index: false, follow: false },
};

export default async function AlphabetReviewPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  reviewRouteOnly();
  const { lang } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      {lang === "ko" ? <HangulChart /> : <KanaChart />}
    </main>
  );
}
