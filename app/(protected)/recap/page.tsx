import { Suspense } from "react";

import WeeklyRecap from "@/components/recap/WeeklyRecap";

/* The weekly recap card (Chi, 2026-11-15: 每週回顧卡): components/recap/WeeklyRecap.
   Suspense for its milestone, read from the query on the phone. */
export default function RecapPage() {
  return (
    <Suspense fallback={null}>
      <WeeklyRecap />
    </Suspense>
  );
}
