"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { AppLanguage, VocabularyItem } from "@/lib/types/app";

export default function ReviewPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage>("english");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReviewQueue() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Please log in to review your vocabulary.");
        }

        const now = new Date().toISOString();

        const [{ data: queueData, error: queueError }, profileResult] =
          await Promise.all([
            supabase
              .from("vocabulary_items")
              .select("*")
              .eq("user_id", user.id)
              .lte("next_review_at", now)
              .order("next_review_at", {
                ascending: true,
                nullsFirst: true,
              }),
            supabase
              .from("profiles")
              .select("learning_language")
              .eq("id", user.id)
              .single(),
          ]);

        if (queueError) throw queueError;

        if (!active) return;

        setItems((queueData ?? []) as VocabularyItem[]);

        if (profileResult.data?.learning_language) {
          setLearningLanguage(
            profileResult.data.learning_language as AppLanguage,
          );
        }
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load today's review.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReviewQueue();

    return () => {
      active = false;
    };
  }, []);

  const firstItem = items[0] ?? null;

  const primaryText = useMemo(() => {
    if (!firstItem) return "";

    return learningLanguage === "traditional-chinese"
      ? firstItem.translation
      : firstItem.word;
  }, [firstItem, learningLanguage]);

  const secondaryText = useMemo(() => {
    if (!firstItem) return "";

    return learningLanguage === "traditional-chinese"
      ? firstItem.word
      : firstItem.translation;
  }, [firstItem, learningLanguage]);

  return (
    <main className="min-h-screen bg-[#f5f2eb] px-5 pb-28 pt-7 text-black">
      <div className="mx-auto max-w-xl">
        <header className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center">
          <Link
            href="/vocabulary"
            aria-label="Back to Vocabulary"
            title="Back to Vocabulary"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black/65 shadow-[0_5px_18px_rgba(0,0,0,0.05)] transition-transform active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </Link>

          <div className="min-w-0 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Learning
            </p>

            <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.035em]">
              Today&apos;s Review
            </h1>
          </div>

          <div />
        </header>

        {loading && (
          <section className="mt-16 flex min-h-[420px] items-center justify-center">
            <div className="text-center">
              <LoaderCircle
                size={26}
                className="mx-auto animate-spin text-black/35"
              />

              <p className="mt-4 text-[13px] text-black/40">
                Loading review queue
              </p>
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="mt-10 rounded-[28px] bg-white p-6 shadow-[0_12px_38px_rgba(0,0,0,0.05)]">
            <p className="text-[13px] leading-6 text-red-600">{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-[48px] w-full rounded-full bg-black px-5 text-[13px] font-semibold text-white"
            >
              Try Again
            </button>
          </section>
        )}

        {!loading && !error && items.length === 0 && (
          <section className="mt-16 rounded-[34px] bg-white px-7 py-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.06)]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef5ed] text-[#4d7551]">
              <CheckCircle2 size={25} strokeWidth={1.8} />
            </span>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
              Review complete
            </p>

            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.045em]">
              You&apos;re all caught up.
            </h2>

            <p className="mx-auto mt-3 max-w-xs text-[14px] leading-6 text-black/45">
              There are no vocabulary cards due for review right now.
            </p>

            <Link
              href="/vocabulary"
              className="mt-7 inline-flex min-h-[50px] items-center justify-center rounded-full bg-black px-6 text-[13px] font-semibold text-white"
            >
              Back to Vocabulary
            </Link>
          </section>
        )}

        {!loading && !error && firstItem && (
          <>
            <section className="mt-8 flex items-center justify-between px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35">
                  Review queue
                </p>

                <p className="mt-1 text-[15px] font-semibold">
                  {items.length} {items.length === 1 ? "word" : "words"} ready
                </p>
              </div>

              <span className="rounded-full bg-white px-3.5 py-2 text-[11px] font-semibold text-black/45 shadow-[0_5px_18px_rgba(0,0,0,0.04)]">
                1 / {items.length}
              </span>
            </section>

            <section className="mt-5 overflow-hidden rounded-[34px] bg-white shadow-[0_18px_55px_rgba(0,0,0,0.07)]">
              {firstItem.image_url && (
                <div className="aspect-[16/10] overflow-hidden bg-[#ebe7de]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={firstItem.image_url}
                    alt={firstItem.word}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="px-6 pb-7 pt-6 sm:px-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/30">
                  Front
                </p>

                <h2 className="mt-7 break-words text-[44px] font-semibold leading-[0.95] tracking-[-0.055em]">
                  {primaryText}
                </h2>

                <p className="mt-5 break-words text-[22px] font-medium leading-tight tracking-[-0.025em] text-black/45">
                  {secondaryText}
                </p>

                {firstItem.part_of_speech && (
                  <p className="mt-5 text-[11px] capitalize text-black/30">
                    {firstItem.part_of_speech}
                  </p>
                )}

                <Link
                  href={`/vocabulary/review/session`}
                  className="mt-8 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-black px-6 text-[13px] font-semibold text-white transition-transform active:scale-[0.99]"
                >
                  Start Review
                  <ArrowRight size={16} strokeWidth={1.8} />
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
