import YumiListensReview from "@/components/voice/YumiListensReview";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * Yumi listening, and in her earmuffs, without an account (Chi,
 * 2026-11-27). A development and preview surface: the home's own Yumi,
 * switched between calm, deaf and listening, so the look can be checked on
 * a phone before the signed-in home has it.
 */
export const metadata = {
  title: "Yumi listens review",
  robots: { index: false, follow: false },
};

export default function Page() {
  reviewRouteOnly();
  return <YumiListensReview />;
}
