import ExchangeNotesLaunchV5 from "@/components/launch-v5/ExchangeNotesLaunchV5";

export default function LaunchReviewV5Page() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#07080b",
      }}
    >
      <ExchangeNotesLaunchV5 reviewMode />
    </main>
  );
}
