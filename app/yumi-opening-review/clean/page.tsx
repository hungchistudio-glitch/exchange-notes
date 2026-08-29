import YumiMinimalLaunch from "@/components/launch/YumiMinimalLaunch";

export const metadata = {
  title: "Yumi minimal opening — clean review",
  robots: { index: false, follow: false },
};

/** Control-free route for full-screen review and screen recording. */
export default function CleanYumiOpeningReviewPage() {
  return (
    <main>
      <YumiMinimalLaunch
        launchId="yumi-minimal-v1-clean"
        reviewMode
        showHandoffPreview
        showReviewControls={false}
      />
    </main>
  );
}
