"use client";

import { useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { getReviewDashboardStats } from "@/lib/review/getReviewDashboardStats";
import type { ReviewAnalytics } from "@/lib/review/analytics";

type GreetingCopy = {
  morning: string;
  afternoon: string;
  evening: string;
};

function getGreeting(copy: GreetingCopy) {
  const hour = new Date().getHours();

  if (hour < 12) return copy.morning;
  if (hour < 18) return copy.afternoon;

  return copy.evening;
}

export default function useHomeDashboard() {
  const { t } = useTranslation();

  const morningGreeting = t.home.greeting.morning;
  const afternoonGreeting = t.home.greeting.afternoon;
  const eveningGreeting = t.home.greeting.evening;

  const [stats, setStats] =
    useState<ReviewAnalytics | null>(null);

  const [error, setError] = useState("");
  const [greeting, setGreeting] =
    useState(morningGreeting);

  useEffect(() => {
    let isMounted = true;

    setGreeting(
      getGreeting({
        morning: morningGreeting,
        afternoon: afternoonGreeting,
        evening: eveningGreeting,
      }),
    );

    async function loadDashboard() {
      try {
        setError("");

        const dashboardStats =
          await getReviewDashboardStats();

        if (!isMounted) return;

        setStats(dashboardStats);
      } catch (loadError) {
        console.error(
          "Unable to load Home dashboard:",
          loadError,
        );

        if (!isMounted) return;

        setError(
          "Unable to load your learning progress.",
        );
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [
    afternoonGreeting,
    eveningGreeting,
    morningGreeting,
  ]);

  const loading = stats === null && !error;
  const reviewCount = stats?.due ?? 0;

  return {
    stats,
    error,
    greeting,
    loading,
    reviewCount,
  };
}
