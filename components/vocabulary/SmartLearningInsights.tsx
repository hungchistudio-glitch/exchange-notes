"use client";

import { useEffect, useState } from "react";
import LearningInsights from "./LearningInsights";
import {
  getLearningInsights,
  type LearningInsights as LearningInsightsData,
} from "@/lib/coach/getLearningInsights";

export default function SmartLearningInsights() {
  const [data, setData] = useState<LearningInsightsData>({
    message: "Loading today's learning insights...",
    weakestWord: undefined,
    streak: 0,
  });

  useEffect(() => {
    let mounted = true;

    getLearningInsights().then((result) => {
      if (mounted) {
        setData(result);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LearningInsights
      message={data.message}
      weakestWord={data.weakestWord}
      streak={data.streak}
    />
  );
}
