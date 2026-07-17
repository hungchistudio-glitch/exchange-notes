"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AppCard from "@/components/ui/AppCard";
import AppPage from "@/components/ui/AppPage";
import PageHeader from "@/components/ui/PageHeader";
import ReviewProgress from "@/components/review/ReviewProgress";
import ReviewStats from "@/components/review/ReviewStats";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage, VocabularyItem } from "@/lib/types/app";
import { isDue } from "@/lib/review/scheduler";
import { buildReviewAnalytics } from "@/lib/review/analytics";

export default function ReviewPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [allItems, setAllItems] = useState<VocabularyItem[]>([]);
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
        if (!user) throw new Error("Please log in to review your vocabulary.");

        const [{ data: queueData, error: queueError }, profileResult] =
          await Promise.all([
            supabase
              .from("vocabulary_items")
              .select("*")
              .eq("user_id", user.id)
              .order("next_review_at", { ascending: true, nullsFirst: true }),
            supabase
              .from("profiles")
              .select("learning_language")
              .eq("id", user.id)
              .single(),
          ]);

        if (queueError) throw queueError;
        if (!active) return;

        const vocabulary = (queueData ?? []) as VocabularyItem[];
        setAllItems(vocabulary);
        setItems(vocabulary.filter((item) => isDue(item)));

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
        if (active) setLoading(false);
      }
    }

    void loadReviewQueue();
    return () => {
      active = false;
    };
  }, []);

  const newCount = useMemo(
    () => items.filter((item) => !item.review_count).length,
    [items],
  );
  const learningCount = useMemo(
    () => items.filter((item) => item.status === "learning").length,
    [items],
  );
  const analytics = useMemo(() => buildReviewAnalytics(allItems), [allItems]);
  const firstItem = items[0] ?? null;
  const preview = firstItem
    ? learningLanguage === "traditional-chinese"
      ? firstItem.translation
      : firstItem.word
    : "";

  return (
    <AppPage>
      <PageHeader
        eyebrow="Learning"
        title="Today's Review"
        description="A focused queue based on what is ready to practice now."
        leading={
          <Link
            href="/vocabulary"
            aria-label="Back to Vocabulary"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black/65 shadow-[0_5px_18px_rgba(0,0,0,0.05)]"
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </Link>
        }
      />

      {loading ? (
        <section className="flex min-h-[440px] items-center justify-center">
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
      ) : null}

      {!loading && error ? (
        <AppCard className="mt-8">
          <p className="text-[13px] leading-6 text-red-600">{error}</p>
        </AppCard>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <AppCard padding="lg" className="mt-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f0e7] text-[#3f6945]">
            <CheckCircle2 size={28} strokeWidth={1.8} />
          </span>
          <h2 className="mt-6 text-[30px] font-semibold tracking-[-0.04em]">
            You&apos;re all caught up.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-black/45">
            New words will appear here when they are ready for review.
          </p>
          <Link
            href="/vocabulary"
            className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-full bg-black px-6 text-[13px] font-semibold text-white"
          >
            Back to Vocabulary
          </Link>
        </AppCard>
      ) : null}

      {!loading && !error && firstItem ? (
        <div className="mt-8 space-y-5">
          <AppCard padding="lg" tone="dark">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Ready now
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-white">
                  {items.length}
                </p>
                <p className="mt-2 text-[13px] text-white/55">
                  words in today&apos;s queue
                </p>
              </div>
              <div className="text-right text-[12px] leading-6 text-white/55">
                <p>{newCount} new</p>
                <p>{learningCount} learning</p>
              </div>
            </div>
            <div className="mt-7">
              <ReviewProgress current={0} total={items.length} />
            </div>
          </AppCard>

          <ReviewStats analytics={analytics} />

          <AppCard padding="lg">
            <p className="app-eyebrow">Up next</p>
            <h2 className="mt-4 break-words text-[38px] font-semibold leading-[1.02] tracking-[-0.045em]">
              {preview}
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-black/42">
              Review in both directions and grade how difficult the recall felt.
            </p>
            <Link
              href="/vocabulary/review/session"
              className="mt-7 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-black px-6 text-[13px] font-semibold text-white"
            >
              Start review <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
          </AppCard>
        </div>
      ) : null}
    </AppPage>
  );
}
