"use client";

import { useEffect, useState } from "react";

import { getReviewDashboardStats } from "@/lib/review/getReviewDashboardStats";
import type { ReviewAnalytics } from "@/lib/review/analytics";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

export default function useHomeDashboard() {
  const [stats, setStats] =
    useState<ReviewAnalytics | null>(null);

  const [error, setError] = useState("");
  const [greeting, setGreeting] =
    useState("Welcome back");

  useEffect(() => {
    let isMounted = true;

    setGreeting(getGreeting());

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
  }, []);

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
