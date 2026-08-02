"use client";

import DailyNews from "../../components/DailyNews";

import AppHeader from "@/components/foundation/layout/AppHeader";
import Screen from "@/components/foundation/layout/Screen";

export default function DiscoverPage() {
  return (
    <Screen>
      <AppHeader eyebrow="Exchange Notes" title="探索" />

      <div className="px-4">
        <DailyNews />
      </div>
    </Screen>
  );
}
