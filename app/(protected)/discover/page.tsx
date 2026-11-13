"use client";

import DailyNews from "../../components/DailyNews";

import Screen from "@/components/foundation/layout/Screen";
import { DISCOVER_COLORS } from "@/components/discover/types";

export default function DiscoverPage() {
  return (
    // Page-scoped background override (inline style beats the shared
    // bg-surface utility class without touching the app-wide token) —
    // Discover gets its own warmer, more editorial background level.
    <Screen style={{ backgroundColor: DISCOVER_COLORS.page }}>
      <div className="px-[22px]">
        <DailyNews />
      </div>
    </Screen>
  );
}
