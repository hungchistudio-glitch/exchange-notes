"use client";

import Card from "@/components/foundation/cards/Card";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";

/*
 * The four readings the home screen used to carry.
 *
 * Accuracy, retention, mastered and to-revisit were the bottom of the old
 * home, under "學習總覽". The home is only Yumi now, so they had nowhere to
 * be — and unlike the cards that moved to the vocabulary screen, these are
 * not about today's words. They are about how the learning is going, which
 * is a question you ask on purpose rather than one the app should answer at
 * you every time you open it.
 *
 * Settings is where that question already lives: Cosmic Mode's ProgressHud
 * sits in exactly this slot. This is Standard Mode's counterpart, in the
 * plain surface the rest of this screen uses rather than the instrument
 * panel's.
 *
 * The tiles keep their original gradients. They were the one piece of colour
 * on the old home and they read as four different readings rather than four
 * copies of the same one, which is worth more here, where they are the only
 * thing in the section.
 */

const TONES = {
  amber: "border-[#f3ddb0] bg-gradient-to-br from-[#fdf6e6] to-white",
  sky: "border-[#c9e2f5] bg-gradient-to-br from-[#eef7fd] to-white",
  green: "border-[#cdeac4] bg-gradient-to-br from-[#f2faee] to-white",
  rose: "border-[#f3d3d9] bg-gradient-to-br from-[#fdf0f2] to-white",
} as const;

function Tile({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel: string;
  tone: keyof typeof TONES;
}) {
  return (
    <Card className={`border p-4 ${TONES[tone]}`}>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{sublabel}</p>
    </Card>
  );
}

export default function LearningProgressPanel() {
  const { t } = useTranslation();
  const { items, loading } = useVocabulary();
  const { reviewStats } = useVocabularyStats(items);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        label={t.home.progress.accuracy}
        value={loading ? "…" : `${reviewStats.accuracy}%`}
        sublabel={t.home.progress.totalReviews.replace(
          "{count}",
          String(reviewStats.reviewed),
        )}
        tone="amber"
      />
      <Tile
        label={t.home.progress.retention}
        value={loading ? "…" : `${reviewStats.retention}%`}
        sublabel={t.home.progress.memoryStrength}
        tone="sky"
      />
      <Tile
        label={t.home.progress.mastered}
        value={loading ? "…" : String(reviewStats.mastered)}
        sublabel={t.home.progress.wordsCompleted}
        tone="green"
      />
      <Tile
        label={t.home.progress.practice}
        value={loading ? "…" : String(reviewStats.weak)}
        sublabel={t.home.progress.wordsToRevisit}
        tone="rose"
      />
    </div>
  );
}
