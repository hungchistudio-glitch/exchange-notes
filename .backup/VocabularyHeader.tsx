"use client";

import Link from "next/link";
import { ArrowRight, FolderOpen, Plus, Zap } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";

type Props = {
  todayProgress: number;
  todayGoal: number;
};

export default function VocabularyHeader({ todayProgress, todayGoal }: Props) {
  const remaining = Math.max(0, todayGoal - todayProgress);
  const percentage = Math.min(
    100,
    Math.round((todayProgress / Math.max(todayGoal, 1)) * 100),
  );

  return (
    <>
      <PageHeader
        eyebrow="Your language library"
        title="Vocabulary"
        description="Save words from real life, review them daily, and share what you learn."
        trailing={
          <Link
            href="/capture"
            aria-label="Add a new word"
            className="app-button app-button--primary app-button--icon"
          >
            <Plus size={19} strokeWidth={2} />
          </Link>
        }
      />

      <section className="vocabulary-hero" aria-label="Daily review progress">
        <div className="vocabulary-hero__inner">
          <p className="vocabulary-hero__eyebrow">Today&apos;s review</p>
          <p className="vocabulary-hero__value">
            {todayProgress}
            <span> / {todayGoal}</span>
          </p>
          <p className="vocabulary-hero__meta">
            {remaining > 0
              ? `${remaining} ${remaining === 1 ? "word" : "words"} left to reach your goal`
              : "Daily goal complete — keep the streak going."}
          </p>
          <div className="vocabulary-hero__track" aria-hidden="true">
            <div
              className="vocabulary-hero__fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="vocabulary-hero__actions">
          <Link
            href="/vocabulary/collections"
            className="vocabulary-hero__action vocabulary-hero__action--glass"
          >
            <FolderOpen size={16} />
            Collections
          </Link>
          <Link
            href="/vocabulary/review"
            className="vocabulary-hero__action vocabulary-hero__action--light"
          >
            <Zap size={16} />
            Start review
          </Link>
          <Link
            href="/vocabulary/quiz"
            className="vocabulary-hero__action vocabulary-hero__action--glass"
          >
            Quick quiz
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
