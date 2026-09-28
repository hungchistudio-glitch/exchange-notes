import StandardHomeReview from "@/components/home/StandardHomeReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Liquid glass orbit review",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ frame?: string }>;
}) {
  reviewRouteOnly();
  return <StandardHomeReview frame={(await searchParams).frame === "1"} />;
}
