import NewsWindReview from "@/components/discover/NewsWindReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The news page's arrival without an account (Chi, 2026-11-28): the real
 * DailyNews over a fixed batch of stories, with keys to replay the full
 * wind or the short gust. ?mode=cosmic for Yumi Cosmic.
 */
export const metadata = {
  title: "News wind review",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  reviewRouteOnly();
  return <NewsWindReview cosmic={(await searchParams).mode === "cosmic"} />;
}
