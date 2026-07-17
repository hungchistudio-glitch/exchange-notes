import ReviewSession from "@/components/vocabulary/ReviewSession";
import { getTodaysReview } from "@/lib/review/getTodaysReview";

export default async function ReviewPage() {
  const words = await getTodaysReview();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">

      <div>
        <h1 className="text-3xl font-bold">
          Today's Review
        </h1>

        <p className="mt-2 text-neutral-500">
          Review today's vocabulary with spaced repetition.
        </p>
      </div>

      <ReviewSession words={words} />

    </main>
  );
}
