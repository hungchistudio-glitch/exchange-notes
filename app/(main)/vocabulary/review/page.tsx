"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ReviewPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-[#faf8f3] px-6 py-6">
      <header className="flex items-center gap-4">
        <Link
          href="/vocabulary"
          aria-label="Back to vocabulary"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white"
        >
          <ArrowLeft size={18} />
        </Link>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
            Learning
          </p>

          <h1 className="text-3xl font-bold">Today&apos;s Review</h1>
        </div>
      </header>

      <section className="mt-16 flex flex-1 items-center justify-center">
        <div className="w-full rounded-[36px] bg-white p-10 shadow-[0_18px_50px_rgba(0,0,0,0.07)]">
          <p className="text-center text-neutral-400">Review Queue</p>

          <h2 className="mt-6 text-center text-5xl font-bold">0</h2>

          <p className="mt-4 text-center text-neutral-500">words ready</p>
        </div>
      </section>
    </main>
  );
}
