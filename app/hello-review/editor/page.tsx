import HelloEditorReview from "@/components/hello/HelloEditorReview";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

/*
 * The hello editor with a fixture word, signed out. ?profile=same gives a
 * learner whose two languages are the same and ?profile=none one with
 * none stored, which the editor must ask about rather than guess.
 */
export const metadata = {
  title: "Yumi hello editor review",
  robots: { index: false, follow: false },
};

export default async function HelloEditorReviewPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  reviewRouteOnly();
  const [storedMode, params] = await Promise.all([getServerInterfaceMode(), searchParams]);
  const profile =
    params.profile === "same"
      ? { learning: "en" as const, native: "en" as const }
      : params.profile === "none"
        ? { learning: null, native: null }
        : { learning: "en" as const, native: "zh-TW" as const };
  return <HelloEditorReview storedMode={storedMode} {...profile} />;
}
