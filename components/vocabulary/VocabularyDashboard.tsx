type Props = {
  total: number;
  learning: number;
  mastered: number;
};

export default function VocabularyDashboard({
  total,
  learning,
  mastered,
}: Props) {
  return (
    <section className="mb-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight">
        Vocabulary
      </h1>

      <p className="mt-2 text-neutral-500">
        Build your personal language library.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">

        <div className="rounded-2xl bg-neutral-50 p-4">
          <div className="text-xs uppercase tracking-wide text-neutral-400">
            Total
          </div>
          <div className="mt-2 text-3xl font-bold">
            {total}
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-50 p-4">
          <div className="text-xs uppercase tracking-wide text-neutral-400">
            Learning
          </div>
          <div className="mt-2 text-3xl font-bold">
            {learning}
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-50 p-4">
          <div className="text-xs uppercase tracking-wide text-neutral-400">
            Mastered
          </div>
          <div className="mt-2 text-3xl font-bold">
            {mastered}
          </div>
        </div>

      </div>
    </section>
  );
}
