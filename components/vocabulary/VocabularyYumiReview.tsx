"use client";

import { useRouter } from "next/navigation";

import DailyFocusCard from "@/components/dashboard/DailyFocusCard";
import AppPage from "@/components/ui/AppPage";
import YumiCompanion from "@/components/vocabulary/pet/YumiCompanion";

/**
 * Yumi and Daily Focus as the vocabulary page has them, signed out: no
 * words of her own to feed her, and a Daily Focus five words into a
 * queue of 21. The five features, and Continue review, go to stand-in
 * pages.
 */
export default function VocabularyYumiReview() {
  const router = useRouter();
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
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-24 rounded-[22px] bg-black/[0.04]" />
          ))}
        </div>
      </div>
    </AppPage>
  );
}
