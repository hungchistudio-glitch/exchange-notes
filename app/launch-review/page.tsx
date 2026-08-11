import ExchangeNotesLaunchV3 from "@/components/launch-v3/ExchangeNotesLaunchV3";

export default function LaunchReviewPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#090b0e",
      }}
    >
      <ExchangeNotesLaunchV3 reviewMode />
    </main>
  );
}
