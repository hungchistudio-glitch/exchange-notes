import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function VocabularyEmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-8 py-14 text-center">

      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
        <BookOpen className="h-8 w-8 text-neutral-600" />
      </div>

      <h3 className="text-2xl font-bold">
        Your vocabulary is empty
      </h3>

      <p className="mx-auto mt-3 max-w-md text-neutral-500">
        Start building your personal language library by capturing a photo
        or adding your first word.
      </p>

      <div className="mt-8 flex justify-center gap-4">

        <Link
          href="/capture"
          className="rounded-xl bg-black px-6 py-3 text-white transition hover:opacity-90"
        >
          Capture
        </Link>

        <Link
          href="/vocabulary/new"
          className="rounded-xl border border-neutral-300 bg-white px-6 py-3 transition hover:bg-neutral-100"
        >
          Add Word
        </Link>

      </div>

    </div>
  );
}
