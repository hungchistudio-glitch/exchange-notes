import CosmicSurfacesReview from "@/components/cosmic/CosmicSurfacesReview";
import { getServerInterfaceMode } from "@/lib/preferences/serverPreferences";
import { reviewRouteOnly } from "@/lib/reviewRoutes";

export const metadata = {
  title: "Cosmic surfaces review",
  robots: { index: false, follow: false },
};

export default async function CosmicSurfacesReviewPage() {
  reviewRouteOnly();

  const storedMode = await getServerInterfaceMode();

  return <CosmicSurfacesReview storedMode={storedMode} />;
}
