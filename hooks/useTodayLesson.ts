"use client";

import { useEffect, useState } from "react";
import { getTodaysLesson } from "@/lib/dailyLesson/getTodaysLesson";
import type { DailyLesson } from "@/lib/dailyLesson/lessonTypes";

export function useTodayLesson() {
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getTodaysLesson();

        if (active) {
          setLesson(result);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return {
    lesson,
    loading,
  };
}
