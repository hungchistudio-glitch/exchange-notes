"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Camera,
  UserRoundPlus,
} from "lucide-react";

import DailyFocusCard from "@/components/dashboard/DailyFocusCard";
import DashboardCard from "@/components/dashboard/DashboardCard";
import {
  PageContainer,
  StatusMessage,
} from "@/components/foundation";
import HomeHeader from "@/components/home/HomeHeader";
import PronunciationHub from "@/components/pronunciation/PronunciationHub";
import TodayWordCard from "@/components/pronunciation/TodayWordCard";
import useHomeDashboard from "@/hooks/home/useHomeDashboard";
import useTranslation from "@/hooks/i18n/useTranslation";

function insertCount(
  template: string,
  count: number,
) {
  return template.replace("{count}", String(count));
}

export default function HomePage() {
  const { t } = useTranslation();
  const {
    stats,
    error,
    greeting,
    loading,
    reviewCount,
  } = useHomeDashboard();

  const quickStartCopy = t.home.quickStart;
  const progressCopy = t.home.progress;

  const reviewStatus = loading
    ? quickStartCopy.loadingWords
    : reviewCount === 1
      ? quickStartCopy.wordReady
      : reviewCount > 1
        ? insertCount(
            quickStartCopy.wordsReady,
            reviewCount,
          )
        : quickStartCopy.caughtUp;

  const reviewValue = loading
    ? "—"
    : `${reviewCount} ${
        reviewCount === 1
          ? progressCopy.word
          : progressCopy.words
      }`;

  return (
    <PageContainer className="pt-7 sm:pt-9">
      <div className="space-y-8">
        <HomeHeader greeting={greeting} />

        {error ? (
          <StatusMessage tone="danger">
            {error}
          </StatusMessage>
        ) : null}

        <section aria-labelledby="daily-focus-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
              {t.home.dailyFocus.eyebrow}
            </p>

            <h2
              id="daily-focus-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
            >
              {t.home.dailyFocus.sectionTitle}
            </h2>
          </div>

          <DailyFocusCard
            due={stats?.due ?? 0}
            retention={stats?.retention ?? 100}
            accuracy={stats?.accuracy ?? 0}
            loading={loading}
          />
        </section>

        <section aria-labelledby="today-word-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                {t.home.todayWord.eyebrow}
              </p>

              <h2
                id="today-word-title"
                className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
              >
                {t.home.todayWord.title}
              </h2>
            </div>

            <Link
              href="/vocabulary"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-black/48 transition-colors hover:text-black"
            >
              {t.home.todayWord.allWords}
              <ArrowRight
                aria-hidden="true"
                size={15}
                strokeWidth={1.9}
              />
            </Link>
          </div>

          <TodayWordCard />
        </section>

        <section aria-labelledby="continue-learning-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
              {quickStartCopy.eyebrow}
            </p>

            <h2
              id="continue-learning-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
            >
              {quickStartCopy.title}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/review"
              className="group rounded-[24px] bg-black p-5 text-white transition-transform active:scale-[0.985]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12">
                <BookOpenCheck
                  aria-hidden="true"
                  size={19}
                  strokeWidth={1.9}
                />
              </span>

              <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">
                {quickStartCopy.review}
              </p>

              <p className="mt-1 text-xs leading-5 text-white/58">
                {reviewStatus}
              </p>
            </Link>

            <Link
              href="/capture"
              className="group rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.985]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.045] text-black/60">
                <Camera
                  aria-hidden="true"
                  size={19}
                  strokeWidth={1.9}
                />
              </span>

              <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-black">
                {quickStartCopy.capture}
              </p>

              <p className="mt-1 text-xs leading-5 text-black/42">
                {quickStartCopy.captureDescription}
              </p>
            </Link>
          </div>

          <div className="mt-3">
            <PronunciationHub />
          </div>
        </section>

        <section aria-labelledby="progress-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
              {progressCopy.eyebrow}
            </p>

            <h2
              id="progress-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
            >
              {progressCopy.title}
            </h2>
          </div>

          <DashboardCard
            title={progressCopy.todaysReview}
            value={reviewValue}
            subtitle={
              reviewCount > 0
                ? progressCopy.readyDescription
                : progressCopy.caughtUpDescription
            }
            action={
              <Link
                href="/review"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              >
                {reviewCount > 0
                  ? progressCopy.continueReview
                  : progressCopy.openReview}

                <ArrowRight
                  aria-hidden="true"
                  size={15}
                  strokeWidth={1.9}
                />
              </Link>
            }
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <DashboardCard
              compact
              title={progressCopy.accuracy}
              value={
                loading
                  ? "—"
                  : `${stats?.accuracy ?? 0}%`
              }
              subtitle={insertCount(
                progressCopy.totalReviews,
                stats?.reviewed ?? 0,
              )}
            />

            <DashboardCard
              compact
              title={progressCopy.retention}
              value={
                loading
                  ? "—"
                  : `${stats?.retention ?? 100}%`
              }
              subtitle={progressCopy.memoryStrength}
            />

            <DashboardCard
              compact
              title={progressCopy.mastered}
              value={
                loading
                  ? "—"
                  : stats?.mastered ?? 0
              }
              subtitle={progressCopy.wordsCompleted}
            />

            <DashboardCard
              compact
              title={progressCopy.practice}
              value={
                loading
                  ? "—"
                  : stats?.weak ?? 0
              }
              subtitle={progressCopy.wordsToRevisit}
            />
          </div>
        </section>

        <section aria-labelledby="friends-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
              {t.home.community.eyebrow}
            </p>

            <h2
              id="friends-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
            >
              {t.home.community.title}
            </h2>
          </div>

          <Link
            href="/friends"
            className="group flex items-center justify-between rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                <UserRoundPlus
                  aria-hidden="true"
                  size={19}
                  strokeWidth={1.9}
                />
              </span>

              <div className="min-w-0">
                <p className="font-semibold tracking-[-0.015em] text-black">
                  {t.home.community.findFriends}
                </p>

                <p className="mt-1 text-sm leading-5 text-black/43">
                  {t.home.community.description}
                </p>
              </div>
            </div>

            <ArrowRight
              aria-hidden="true"
              size={17}
              strokeWidth={1.8}
              className="ml-3 shrink-0 text-black/25 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </section>
      </div>
    </PageContainer>
  );
}
