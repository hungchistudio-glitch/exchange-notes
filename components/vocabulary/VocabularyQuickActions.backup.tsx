import Link from "next/link";
import { Camera, Plus, Brain } from "lucide-react";

export default function VocabularyQuickActions() {
  return (
    <section className="mb-8 grid grid-cols-3 gap-4">

      <Link
        href="/capture"
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <Camera className="mb-3 h-6 w-6" />
        <div className="font-semibold">Capture</div>
        <div className="mt-1 text-xs text-neutral-500">
          Learn from photos
        </div>
      </Link>

      <Link
        href="/vocabulary/new"
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <Plus className="mb-3 h-6 w-6" />
        <div className="font-semibold">Add Word</div>
        <div className="mt-1 text-xs text-neutral-500">
          Create manually
        </div>
      </Link>

      <Link
        href="/vocabulary/review"
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <Brain className="mb-3 h-6 w-6" />
        <div className="font-semibold">Review</div>
        <div className="mt-1 text-xs text-neutral-500">
          Practice now
        </div>
      </Link>

    </section>
  );
}
