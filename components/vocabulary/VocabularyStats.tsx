type VocabularyStatsProps = {
  totalWords: number;
  newWords: number;
  learningWords: number;
  masteredWords: number;
};

export default function VocabularyStats({
  totalWords,
  newWords,
  learningWords,
  masteredWords,
}: VocabularyStatsProps) {
  const stats = [
    {
      label: "All words",
      value: totalWords,
      detail: "Saved",
    },
    {
      label: "New",
      value: newWords,
      detail: "To begin",
    },
    {
      label: "Learning",
      value: learningWords,
      detail: "In progress",
    },
    {
      label: "Mastered",
      value: masteredWords,
      detail: "Completed",
    },
  ];

  return (
    <section
      aria-label="Vocabulary statistics"
      className="mt-4 grid grid-cols-2 gap-2"
    >
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="rounded-[22px] border border-black/[0.05] bg-white p-4 shadow-[0_3px_16px_rgba(0,0,0,0.035)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/35">
                {stat.label}
              </p>

              <p className="mt-2 text-[26px] font-semibold tracking-[-0.045em]">
                {stat.value}
              </p>
            </div>

            <div className="mt-1 h-2 w-2 rounded-full bg-black/15" />
          </div>

          <p className="mt-2 text-[11px] text-black/35">{stat.detail}</p>
        </article>
      ))}
    </section>
  );
}
