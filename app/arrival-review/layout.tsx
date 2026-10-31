import type { ReactNode } from "react";

import ArrivalReviewShell from "@/components/foundation/review/ArrivalReviewShell";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * A page's arrival without an account (lib/motion/pageArrival): the real
 * RouteStage and the real skeleton, around four stand-in pages, one of them
 * slow enough to show its outline first and one with a fixed composer.
 * Navigate with the dock at the bottom.
 */
export const metadata = {
  title: "Arrival review",
  robots: { index: false, follow: false },
};

export default function ArrivalReviewLayout({ children }: { children: ReactNode }) {
  reviewRouteOnly();
  return <ArrivalReviewShell>{children}</ArrivalReviewShell>;
}
