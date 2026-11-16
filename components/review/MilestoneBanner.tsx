"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useOptionalVocabulary } from "@/contexts/VocabularyContext";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { loadActivity } from "@/lib/recap/activity";
import { markMilestoneSeen, milestoneToOffer, seenMilestones, type Milestone } from "@/lib/recap/milestones";
import { buildWeekRecap } from "@/lib/recap/weekly";

/** Long enough to see a year's run of days. */
const STREAK_DAYS = 400;

/**
 * A milestone, offered once on the review page (Chi, 2026-11-15: 達成里程碑時
 * 在複習頁提醒): the library's round number of words, or a run of days.
 * Opening it opens the recap card headed by it; either way it is not
 * offered again (lib/recap/milestones.ts).
 */
export default function MilestoneBanner() {
  const vocabulary = useOptionalVocabulary();
  if (!vocabulary || vocabulary.loading || vocabulary.items.length === 0) return null;
  return <Offer items={vocabulary.items} />;
}

function Offer({ items }: { items: NonNullable<ReturnType<typeof useOptionalVocabulary>>["items"] }) {
  const { t } = useTranslation();
  const copy = t.recap;
  const { learningLanguage } = useDisplayLanguages();
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    let alive = true;
    loadActivity(STREAK_DAYS)
      .then(({ reviews, attempts }) => {
        if (!alive) return;
        const { streak } = buildWeekRecap({ items, reviews, attempts, learning: learningLanguage });
        setMilestone(milestoneToOffer({ totalWords: items.length, streak }, seenMilestones()));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [items, learningLanguage]);

  if (!milestone) return null;

  const what = fill(milestone.kind === "words" ? copy.milestoneWords : copy.milestoneStreak, { n: milestone.value });
  const letGo = () => {
    markMilestoneSeen(milestone.id);
    setMilestone(null);
  };

  return (
    <div className="hud-panel milestone-banner mt-4 flex items-center gap-3 rounded-[22px] border border-line bg-white px-5 py-4">
      <span className="hud-led" data-state="alert" aria-hidden="true" />
      <Link href={`/recap?milestone=${milestone.id}`} onClick={letGo} className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{fill(copy.milestoneBanner, { milestone: what })}</span>
        <span className="mt-0.5 block text-[0.8125rem] font-semibold text-ink-soft">{copy.milestoneShare} →</span>
      </Link>
      <button
        type="button"
        onClick={letGo}
        aria-label={t.common.close}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft"
      >
        <X size={16} />
      </button>
    </div>
  );
}
