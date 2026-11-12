import type { ReactNode } from "react";

import VocabularyYumiReviewShell from "@/components/vocabulary/VocabularyYumiReviewShell";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The vocabulary page's top half without an account: Yumi with her halo of
 * five features, and Daily Focus under her. Each feature leads to a
 * stand-in page behind a loading outline, so the way into it can be seen
 * as the real one plays (the real RouteStage, the real skeleton).
 */
export const metadata = {
  title: "Vocabulary Yumi review",
  robots: { index: false, follow: false },
};

export default async function VocabularyYumiReviewLayout({ children }: { children: ReactNode }) {
  reviewRouteOnly();
  const storedMode = await getServerInterfaceMode();
  return <VocabularyYumiReviewShell storedMode={storedMode}>{children}</VocabularyYumiReviewShell>;
}
