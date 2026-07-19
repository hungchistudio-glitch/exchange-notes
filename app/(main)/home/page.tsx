"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import DashboardCard from "@/components/dashboard/DashboardCard";
import PronunciationHub from "@/components/pronunciation/PronunciationHub";
import TodayWordCard from "@/components/pronunciation/TodayWordCard";
import { getReviewDashboardStats } from "@/lib/review/getReviewDashboardStats";
import type { ReviewAnalytics } from "@/lib/review/analytics";

export default function HomePage() {
  const [stats, setStats] = useState<ReviewAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError("");

        const dashboardStats =
          await getReviewDashboardStats();

        setStats(dashboardStats);
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load your learning progress.");
      }
    }

    void loadDashboard();
  }, []);

  const loading = stats === null && !error;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back 👋
        </h1>

        <p className="mt-2 text-neutral-500">
          Keep building your vocabulary every day.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <TodayWordCard />

      <PronunciationHub />


      <DashboardCard
        title="Today's Review"
        value={
          loading
            ? "Loading..."
            : `${stats?.due ?? 0} word${
                stats?.due === 1 ? "" : "s"
              }`
        }
        subtitle={
          stats?.due
            ? "Your vocabulary is ready to review."
            : "You're all caught up for now."
        }
        action={
          <Link
            href="/review"
            className="inline-flex rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            {stats?.due ? "Continue Review" : "Open Review"}
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-4">
        <DashboardCard
          title="Accuracy"
          value={loading ? "—" : `${stats?.accuracy ?? 0}%`}
          subtitle={`${stats?.reviewed ?? 0} total reviews`}
        />

        <DashboardCard
          title="Retention"
          value={loading ? "—" : `${stats?.retention ?? 100}%`}
          subtitle="Estimated memory strength"
        />

        <DashboardCard
          title="Mastered"
          value={loading ? "—" : stats?.mastered ?? 0}
          subtitle="Vocabulary completed"
        />

        <DashboardCard
          title="Needs Practice"
          value={loading ? "—" : stats?.weak ?? 0}
          subtitle="Words needing attention"
        />
      </section>
    </main>
  );
}
