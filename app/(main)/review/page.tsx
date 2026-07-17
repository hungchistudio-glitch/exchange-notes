import ReviewSession from "@/components/vocabulary/ReviewSession";

const sampleWords = [
  {
    id: "1",
    english: "Apple",
    chinese: "蘋果",
    example: "I eat an apple every morning.",
  },
  {
    id: "2",
    english: "Mountain",
    chinese: "山",
    example: "The mountain is beautiful.",
  },
  {
    id: "3",
    english: "Journey",
    chinese: "旅程",
    example: "Every journey starts with one step.",
  },
];

export default function ReviewPage() {
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

      <ReviewSession words={sampleWords} />

    </main>
  );
}
