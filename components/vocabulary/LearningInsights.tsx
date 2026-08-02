import { Sparkles } from "lucide-react";

type Props = {
  weakestWord?: string;
  streak?: number;
  message: string;
};

export default function LearningInsights({
  weakestWord,
  streak = 0,
  message,
}: Props) {
  return (
    <section className="mb-8 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-6">

      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white">
          <Sparkles size={20} />
        </div>

        <div>
          <p className="text-sm font-medium text-violet-600">
            AI Learning Assistant
          </p>

          <h2 className="text-2xl font-bold">
            Daily Insights
          </h2>
        </div>

      </div>

      <p className="mt-6 text-[17px] leading-8 text-neutral-700">
        {message}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">

        {weakestWord && (
          <span className="rounded-full bg-white px-4 py-2 text-sm shadow-sm">
            Weakest: <strong>{weakestWord}</strong>
          </span>
        )}

        <span className="rounded-full bg-white px-4 py-2 text-sm shadow-sm">
          🔥 {streak} day streak
        </span>

      </div>

    </section>
  );
}
