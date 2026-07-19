type Props = {
  due: number;
};

export default function LearningCoach({ due }: Props) {
  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const reviewMinutes = Math.max(1, Math.ceil(due / 4));

  return (
    <section className="mb-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <p className="text-sm text-neutral-400">{greeting}</p>

      <h2 className="mt-2 text-4xl font-bold tracking-tight">
        Today&apos;s Focus
      </h2>

      <div className="mt-8 space-y-4 rounded-2xl bg-white/10 p-5 backdrop-blur">
        <div className="flex justify-between">
          <span>Words to review</span>

          <span className="font-semibold">{due}</span>
        </div>

        <div className="flex justify-between">
          <span>Estimated time</span>

          <span className="font-semibold">{reviewMinutes} min</span>
        </div>
      </div>
    </section>
  );
}
