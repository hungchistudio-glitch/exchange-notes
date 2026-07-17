"use client";

import Link from "next/link";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppPage from "@/components/ui/AppPage";
import PageHeader from "@/components/ui/PageHeader";
import ReviewActions from "@/components/review/ReviewActions";
import ReviewCard from "@/components/review/ReviewCard";
import ReviewProgress from "@/components/review/ReviewProgress";
import ReviewSummary from "@/components/review/ReviewSummary";
import {
  scheduleReview,
  type ReviewGrade,
  isDue,
} from "@/lib/review/scheduler";
import { createClient } from "@/lib/supabase/client";
import type { AppLanguage, VocabularyItem } from "@/lib/types/app";

type SessionStats = { reviewed: number; correct: number; mastered: number };

export default function ReviewSessionPage() {
  const [initialItems, setInitialItems] = useState<VocabularyItem[]>([]);
  const [queue, setQueue] = useState<VocabularyItem[]>([]);
  const [learningLanguage, setLearningLanguage] =
    useState<AppLanguage>("english");
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<SessionStats>({
    reviewed: 0,
    correct: 0,
    mastered: 0,
  });
  const [directionIndex, setDirectionIndex] = useState(0);
  const [cardStartedAt, setCardStartedAt] = useState(() => Date.now());

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to review your vocabulary.");

      const [{ data, error: queueError }, profileResult] = await Promise.all([
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

      const due = ((data ?? []) as VocabularyItem[]).filter((item) =>
        isDue(item),
      );
      setInitialItems(due);
      setQueue(due);
      setStats({ reviewed: 0, correct: 0, mastered: 0 });
      setDirectionIndex(0);
      setRevealed(false);
      setCardStartedAt(Date.now());
      if (profileResult.data?.learning_language)
        setLearningLanguage(
          profileResult.data.learning_language as AppLanguage,
        );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the review session.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const currentItem = queue[0] ?? null;
  const completed =
    initialItems.length - Math.min(initialItems.length, queue.length);
  const direction = directionIndex % 2 === 0 ? "target-first" : "native-first";

  const handleGrade = async (grade: ReviewGrade) => {
    if (!currentItem || saving) return;
    setSaving(true);
    setError("");

    try {
      const update = scheduleReview(currentItem, grade);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to save this review.");

      const { error: updateError } = await supabase
        .from("vocabulary_items")
        .update(update)
        .eq("id", currentItem.id);
      if (updateError) throw updateError;

      const { error: eventError } = await supabase.from("review_events").insert({
        user_id: user.id,
        vocabulary_item_id: currentItem.id,
        grade,
        interval_days: update.review_interval,
        ease_factor: update.review_ease,
        response_time_ms: Math.max(0, Date.now() - cardStartedAt),
      });
      if (eventError) console.warn("Review event was not recorded", eventError);

      const updatedItem = { ...currentItem, ...update };
      setStats((previous) => ({
        reviewed: previous.reviewed + 1,
        correct: previous.correct + (grade === "again" ? 0 : 1),
        mastered:
          previous.mastered +
          (updatedItem.status === "mastered" &&
          currentItem.status !== "mastered"
            ? 1
            : 0),
      }));

      setQueue((previous) => {
        const remaining = previous.slice(1);
        if (grade === "again") return [...remaining, updatedItem];
        return remaining;
      });
      setDirectionIndex((value) => value + 1);
      setRevealed(false);
      setCardStartedAt(Date.now());
    } catch (gradeError) {
      setError(
        gradeError instanceof Error
          ? gradeError.message
          : "Could not save this review.",
      );
    } finally {
      setSaving(false);
    }
  };

  const title = useMemo(
    () => (currentItem ? "Review session" : "Review complete"),
    [currentItem],
  );

  return (
    <AppPage>
      <PageHeader
        eyebrow="Learning"
        title={title}
        leading={
          <Link
            href="/vocabulary/review"
            aria-label="Back to review"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black/65 shadow-[0_5px_18px_rgba(0,0,0,0.05)]"
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </Link>
        }
      />

      {loading ? (
        <section className="flex min-h-[460px] items-center justify-center">
          <div className="text-center">
            <LoaderCircle
              size={26}
              className="mx-auto animate-spin text-black/35"
            />
            <p className="mt-4 text-[13px] text-black/40">
              Preparing your session
            </p>
          </div>
        </section>
      ) : null}

      {!loading && error ? (
        <div className="mt-5 rounded-[20px] bg-[#f9e8e5] px-4 py-3 text-[12px] font-medium text-[#9a3f35]">
          {error}
        </div>
      ) : null}

      {!loading && currentItem ? (
        <div className="mt-7 space-y-5">
          <ReviewProgress current={completed} total={initialItems.length} />
          <ReviewCard
            item={currentItem}
            learningLanguage={learningLanguage}
            revealed={revealed}
            direction={direction}
            onReveal={() => setRevealed(true)}
          />
          {revealed ? (
            <ReviewActions
              item={currentItem}
              disabled={saving}
              onGrade={handleGrade}
            />
          ) : null}
        </div>
      ) : null}

      {!loading && !currentItem && initialItems.length > 0 ? (
        <ReviewSummary
          reviewed={stats.reviewed}
          correct={stats.correct}
          mastered={stats.mastered}
          onRestart={() => void loadQueue()}
        />
      ) : null}

      {!loading && !currentItem && initialItems.length === 0 && !error ? (
        <div className="mt-10 rounded-[28px] bg-white p-8 text-center">
          <p className="text-[24px] font-semibold">Nothing due right now.</p>
          <Link
            href="/vocabulary"
            className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-full bg-black px-6 text-[13px] font-semibold text-white"
          >
            Back to Vocabulary
          </Link>
        </div>
      ) : null}
    </AppPage>
  );
}
