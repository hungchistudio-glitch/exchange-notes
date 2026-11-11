import RelicsReview from "@/components/starweaver/RelicsReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/* The 17 relics from five angles each, and worn together (development and
   preview only, as every review screen is). */
export const metadata = {
  title: "Starwoven Relics review",
  robots: { index: false, follow: false },
};

export default function StarweaverRelicsReviewPage() {
  reviewRouteOnly();
  return <RelicsReview />;
}
