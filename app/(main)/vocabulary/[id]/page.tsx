"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type VocabularyItem = {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  example_sentence: string | null;
  translated_example: string | null;
  notes: string | null;
  part_of_speech: string | null;
  category: string | null;
  status: string | null;
  review_count: number | null;
  correct_count: number | null;
  review_interval: number | null;
  review_ease: number | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "Ready to review";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ready to review";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function VocabularyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [word, setWord] =
    useState<VocabularyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadWord() {
      try {
        setLoading(true);
        setError("");

        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "Please log in to view this word.",
          );
        }

        const { data, error: fetchError } =
          await supabase
            .from("vocabulary_items")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (fetchError) {
          throw fetchError;
        }

        if (active) {
          setWord(data as VocabularyItem);
        }
      } catch (loadError) {
        console.error(loadError);

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load this word.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (id) {
      void loadWord();
    }

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="animate-pulse space-y-5">
          <div className="h-5 w-24 rounded bg-neutral-200" />
          <div className="h-14 w-2/3 rounded bg-neutral-200" />
          <div className="h-8 w-1/3 rounded bg-neutral-100" />
          <div className="h-56 rounded-3xl bg-neutral-100" />
        </div>
      </main>
    );
  }

  if (error || !word) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Link
          href="/vocabulary"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600"
        >
          <ArrowLeft size={18} />
          Vocabulary
        </Link>

        <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-2xl font-bold">
            Word not found
          </h1>

          <p className="mt-2 text-red-700">
            {error || "This word is unavailable."}
          </p>
        </section>
      </main>
    );
  }

  const accuracy =
    word.review_count && word.review_count > 0
      ? Math.round(
          ((word.correct_count ?? 0) /
            word.review_count) *
            100,
        )
      : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-black"
      >
        <ArrowLeft size={18} />
        Vocabulary
      </Link>

      <header className="mt-8 rounded-[32px] bg-black p-8 text-white">
        <div className="flex flex-wrap gap-2">
          {word.part_of_speech && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
              {word.part_of_speech}
            </span>
          )}

          {word.category && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
              {word.category}
            </span>
          )}

          {word.status && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize">
              {word.status}
            </span>
          )}
        </div>

        <h1 className="mt-6 break-words text-5xl font-bold tracking-tight">
          {word.word}
        </h1>

        <p className="mt-3 text-2xl text-neutral-300">
          {word.translation}
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Reviews
          </p>
          <p className="mt-2 text-2xl font-bold">
            {word.review_count ?? 0}
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Accuracy
          </p>
          <p className="mt-2 text-2xl font-bold">
            {accuracy}%
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Next review
          </p>
          <p className="mt-2 font-semibold">
            {formatDate(word.next_review_at)}
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <article className="rounded-3xl border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Example
          </p>

          <p className="mt-3 text-lg leading-8">
            {word.example_sentence ||
              "No example sentence yet."}
          </p>

          {word.translated_example && (
            <p className="mt-3 leading-7 text-neutral-500">
              {word.translated_example}
            </p>
          )}
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Notes
          </p>

          <p className="mt-3 leading-7 text-neutral-700">
            {word.notes || "No notes yet."}
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Review details
          </p>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">
                Last reviewed
              </dt>
              <dd className="text-right font-medium">
                {word.last_reviewed_at
                  ? formatDate(word.last_reviewed_at)
                  : "Never"}
              </dd>
            </div>

            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">
                Interval
              </dt>
              <dd className="font-medium">
                {word.review_interval ?? 0} days
              </dd>
            </div>

            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">
                Ease
              </dt>
              <dd className="font-medium">
                {Number(
                  word.review_ease ?? 2.5,
                ).toFixed(2)}
              </dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}
