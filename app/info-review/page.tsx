import InfoReview from "@/components/info/InfoReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = { title: "Information pages review", robots: { index: false, follow: false } };

export default function Page() {
  reviewRouteOnly();
  return <InfoReview />;
}
