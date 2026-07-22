import Link from "next/link";

type Props = {
  due: number;
};

export default function TodayReviewCard({ due }: Props) {
  return (
    <section className="rounded-3xl bg-black p-8 text-white">
      <p className="text-neutral-400 text-sm">Today&apos;s Review</p>

      <h2 className="mt-2 text-5xl font-bold">{due}</h2>

      <p className="mt-2 text-neutral-300">
        {due === 1 ? "word due" : "words due"}
      </p>

      <Link
        href="/review?from=vocabulary"
        className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black"
      >
        Continue Review →
      </Link>
    </section>
  );
}
