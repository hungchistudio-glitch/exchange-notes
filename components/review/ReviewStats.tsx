import type { ReviewAnalytics } from "@/lib/review/analytics";

type Props = { analytics: ReviewAnalytics };

export default function ReviewStats({ analytics }: Props) {
  const stats = [
    ["Accuracy", `${analytics.accuracy}%`],
    ["Retention", `${analytics.retention}%`],
    ["Mastered", String(analytics.mastered)],
    ["Need focus", String(analytics.weak)],
  ];

  return (
    <section className="grid grid-cols-2 gap-3">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-[22px] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">{label}</p>
          <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">{value}</p>
        </div>
      ))}
    </section>
  );
}
