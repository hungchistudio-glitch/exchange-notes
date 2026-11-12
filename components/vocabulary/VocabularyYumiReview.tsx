"use client";

import { useRouter } from "next/navigation";

import DailyFocusCard from "@/components/dashboard/DailyFocusCard";
import TodayTrainingCard from "@/components/pronunciation/lab/TodayTrainingCard";
import { TodayWordDeck } from "@/components/pronunciation/TodayWordCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { DailyTrainingPlan } from "@/lib/pronunciation/lab/dailyTraining";
import type { VocabularyItem } from "@/lib/types/app";
import AppPage from "@/components/ui/AppPage";
import YumiCompanion from "@/components/vocabulary/pet/YumiCompanion";

/**
 * Yumi and Daily Focus as the vocabulary page has them, signed out: no
 * words of her own to feed her, and a Daily Focus five words into a
 * queue of 21. The five features, and Continue review, go to stand-in
 * pages.
 */
/* Sample words for today's deck, in each of its three card tones. */
const SAMPLE_WORDS = [
  ["coordinate", "協調"],
  ["revelation", "啟示"],
  ["harbour", "港口"],
  ["gentle", "溫柔的"],
].map(([word, translation], index) => ({
  id: `sample-${index}`,
  user_id: "review",
  word,
  translation,
  language: "en",
  word_language: "en",
  translation_language: "zh-TW",
  status: "new",
  created_at: "2026-11-12T08:00:00.000Z",
})) as unknown as VocabularyItem[];

const SAMPLE_PLAN: DailyTrainingPlan = {
  language: "en",
  dateKey: "2026-11-12",
  totalSeconds: 360,
  items: [
    { id: "a", kind: "sound", targetId: "h", module: "sounds", label: "H", estimatedSeconds: 60 },
    { id: "b", kind: "sound", targetId: "b", module: "sounds", label: "B", estimatedSeconds: 60 },
    { id: "c", kind: "minimal-pair", targetId: "ae-e", module: "listen", label: "æ / e", estimatedSeconds: 60 },
    { id: "d", kind: "word", targetId: "revelation", module: "words", label: "revelation", estimatedSeconds: 60 },
    { id: "e", kind: "rhythm", targetId: "word-stress", module: "rhythm", label: "word-stress", estimatedSeconds: 60 },
    { id: "f", kind: "speak", targetId: "h", module: "speak", label: "H", estimatedSeconds: 60 },
  ],
};

export default function VocabularyYumiReview() {
  const router = useRouter();
  const { t } = useTranslation();
  const go = (feature: string) => () => router.push(`/vocabulary-yumi-review/${feature}`);
  return (
    <AppPage width="default">
      <YumiCompanion
        items={[]}
        dailyGoal={5}
        dailyProgress={0}
        searchHasNoResults={false}
        cardGlancePulse={0}
        onStartReview={go("practice")}
        onAddWord={go("create")}
        onOpenCamera={go("scan")}
        onOpenPronunciation={go("speak")}
        onOpenCollections={go("collect")}
        onPrefetchFeatures={() => {
          for (const feature of ["practice", "scan", "speak", "collect"]) {
            router.prefetch(`/vocabulary-yumi-review/${feature}`);
          }
        }}
      />
      <div className="px-[21px]">
        <DailyFocusCard
          due={16}
          clearedToday={5}
          retention={82}
          accuracy={76}
          reviewed={40}
          reviewHref="/vocabulary-yumi-review/practice"
        />
        <div className="mt-5" data-review-deck="">
          <TodayWordDeck
            items={SAMPLE_WORDS}
            copy={t.home.todayWord}
            vocabularyCopy={t.vocabulary}
            learningLanguage="en"
            supportLanguage="zh-TW"
          />
        </div>
        <div className="mt-5" data-review-training="">
          <TodayTrainingCard plan={SAMPLE_PLAN} copy={t.pronunciation.lab} />
        </div>
      </div>
    </AppPage>
  );
}
