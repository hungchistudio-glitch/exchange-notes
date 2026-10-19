import HelloReview from "@/components/hello/HelloReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Yumi's hello with sample data, for looking at it before the database
 * exists for it (Chi, 2026-10-19: "先做 fixture 原型"). Every hello here is a
 * labelled fixture from lib/hello/fixtures.ts; nothing reads or writes an
 * account, a hello, or a friend request.
 *
 * ?fixture=star opens the Cosmic sample with a missing language, and
 * ?viewer=own|none|sent|incoming|friends|failed shows a signed-in visitor
 * in that state instead of a guest; ?view=share the sharer's share step,
 * with Yumi's picture taken here and nothing uploaded.
 */
export const metadata = {
  title: "Yumi hello review",
  robots: { index: false, follow: false },
};

export default async function HelloReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; viewer?: string; view?: string }>;
}) {
  reviewRouteOnly();
  const params = await searchParams;
  return (
    <HelloReview
      fixture={params.fixture === "star" || params.fixture === "long" ? params.fixture : "library"}
      viewer={params.viewer ?? "guest"}
      view={params.view === "share" ? "share" : "page"}
    />
  );
}
