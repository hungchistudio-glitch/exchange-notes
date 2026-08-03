"use client";

import DailyNews from "../../components/DailyNews";

import AppHeader from "@/components/foundation/layout/AppHeader";
import Screen from "@/components/foundation/layout/Screen";
import { DISCOVER_COLORS } from "@/components/discover/types";
import useTranslation from "@/hooks/i18n/useTranslation";

export default function DiscoverPage() {
  const { t } = useTranslation();

  return (
    // Page-scoped background override (inline style beats the shared
    // bg-surface utility class without touching the app-wide token) —
    // Discover gets its own warmer, more editorial background level.
    <Screen style={{ backgroundColor: DISCOVER_COLORS.page }}>
      <AppHeader eyebrow={t.discover.eyebrow} title={t.navigation.discover} />

      <div className="px-[22px]">
        <DailyNews />
      </div>
    </Screen>
  );
}
