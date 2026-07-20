"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Camera,
  UserRoundPlus,
} from "lucide-react";

import DashboardCard from "@/components/dashboard/DashboardCard";
import PronunciationHub from "@/components/pronunciation/PronunciationHub";
import TodayWordCard from "@/components/pronunciation/TodayWordCard";
import {
  PageContainer,
  StatusMessage,
} from "@/components/foundation";
import { getReviewDashboardStats } from "@/lib/review/getReviewDashboardStats";
import type { ReviewAnalytics } from "@/lib/review/analytics";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

export default function HomePage() {
  const [stats, setStats] = useState<ReviewAnalytics | null>(null);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    setGreeting(getGreeting());

    async function loadDashboard() {
      try {
        setError("");

        const dashboardStats = await getReviewDashboardStats();

        setStats(dashboardStats);
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load your learning progress.");
      }
    }

    void loadDashboard();
  }, []);

  const loading = stats === null && !error;
  const reviewCount = stats?.due ?? 0;

  return (
    <PageContainer className="pt-7 sm:pt-9">
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
            {greeting}
          </p>

          <h1 className="mt-2 flex items-center gap-2.5 text-[34px] font-semibold leading-tight tracking-[-0.045em] text-black">
            <span>Keep learning</span>

            <svg
              aria-hidden="true"
              className="h-7 w-7 shrink-0 opacity-80"
              viewBox="0 0 400 400"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="0"
                y="0"
                width="400"
                height="400"
                rx="88"
                fill="#f0efec"
              />
              <path
                d="M 300,70 Q 110,70 100,180"
                fill="none"
                stroke="currentColor"
                strokeWidth="52"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 100,180 Q 110,320 300,320"
                fill="none"
                stroke="currentColor"
                strokeWidth="52"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 100,180 L 250,180"
                fill="none"
                stroke="currentColor"
                strokeWidth="52"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="285"
                cy="180"
                r="40"
                fill="#f0efec"
                stroke="currentColor"
                strokeWidth="12"
              />
              <circle cx="294" cy="172" r="14" fill="currentColor" />
              <circle cx="300" cy="166" r="5" fill="#f0efec" />
            </svg>
          </h1>

          <p className="mt-2 max-w-md text-[15px] leading-6 text-black/48">
            Build useful vocabulary from the world around you.
          </p>
        </header>

        {error ? (
          <StatusMessage tone="danger">
            {error}
          </StatusMessage>
        ) : null}

        <section aria-labelledby="today-word-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                Vocabulary first
              </p>

              <h2
                id="today-word-title"
                className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
              >
                Today&apos;s word
              </h2>
            </div>

            <Link
              href="/vocabulary"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-black/48 transition-colors hover:text-black"
            >
              All words
              <ArrowRight size={15} strokeWidth={1.9} />
            </Link>
          </div>

          <TodayWordCard />
        </section>

        <section aria-labelledby="continue-learning-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
              Quick start
            </p>

            <h2
              id="continue-learning-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
            >
              Continue learning
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/review"
              className="group rounded-[24px] bg-black p-5 text-white transition-transform active:scale-[0.985]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12">
                <BookOpenCheck size={19} strokeWidth={1.9} />
              </span>

              <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">
                Review
              </p>

              <p className="mt-1 text-xs leading-5 text-white/58">
                {loading
                  ? "Loading your words…"
                  : reviewCount > 0
                    ? `${reviewCount} word${reviewCount === 1 ? "" : "s"} ready`
                    : "You are caught up"}
              </p>
            </Link>

            <Link
              href="/capture"
              className="group rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.985]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.045] text-black/60">
                <Camera size={19} strokeWidth={1.9} />
              </span>

              <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-black">
                Capture
              </p>

              <p className="mt-1 text-xs leading-5 text-black/42">
                Learn a word from a photo
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
              Your progress
            </p>

            <h2
              id="progress-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
            >
              Learning overview
            </h2>
          </div>

          <DashboardCard
            title="Today's Review"
            value={
              loading
                ? "Loading..."
                : `${reviewCount} word${reviewCount === 1 ? "" : "s"}`
            }
            subtitle={
              reviewCount > 0
                ? "Your vocabulary is ready to review."
                : "You're all caught up for now."
            }
            action={
              <Link
                href="/review"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              >
                {reviewCount > 0 ? "Continue Review" : "Open Review"}
                <ArrowRight size={15} strokeWidth={1.9} />
              </Link>
            }
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <DashboardCard
              compact
              title="Accuracy"
              value={loading ? "—" : `${stats?.accuracy ?? 0}%`}
              subtitle={`${stats?.reviewed ?? 0} total reviews`}
            />

            <DashboardCard
              compact
              title="Retention"
              value={loading ? "—" : `${stats?.retention ?? 100}%`}
              subtitle="Memory strength"
            />

            <DashboardCard
              compact
              title="Mastered"
              value={loading ? "—" : stats?.mastered ?? 0}
              subtitle="Words completed"
            />

            <DashboardCard
              compact
              title="Practice"
              value={loading ? "—" : stats?.weak ?? 0}
              subtitle="Words to revisit"
            />
          </div>
        </section>

        <section aria-labelledby="friends-title">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
              Community
            </p>

            <h2
              id="friends-title"
              className="mt-1 text-xl font-semibold tracking-[-0.025em] text-black"
            >
              Learning partners
            </h2>
          </div>

          <Link
            href="/friends"
            className="group flex items-center justify-between rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                <UserRoundPlus size={19} strokeWidth={1.9} />
              </span>

              <div className="min-w-0">
                <p className="font-semibold tracking-[-0.015em] text-black">
                  Find friends
                </p>

                <p className="mt-1 text-sm leading-5 text-black/43">
                  Add a partner by Exchange ID or QR code.
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
