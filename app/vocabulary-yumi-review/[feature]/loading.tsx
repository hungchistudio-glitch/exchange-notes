import { RouteSkeleton, SkeletonBlock, SkeletonRows } from "@/components/foundation/layout/RouteSkeleton";

export default function VocabularyYumiFeatureLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-40" rounded="rounded-full" />
      <SkeletonBlock className="mt-5 h-[150px] w-full" rounded="rounded-[26px]" />
      <SkeletonRows count={4} />
    </RouteSkeleton>
  );
}
