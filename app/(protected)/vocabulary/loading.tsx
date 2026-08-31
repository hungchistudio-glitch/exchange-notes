import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/** The search field, the filter pills, then the words. */
export default function VocabularyLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-32" rounded="rounded-full" />
      <SkeletonBlock className="mt-5 h-[52px] w-full" rounded="rounded-full" />

      <div className="mt-4 flex gap-2">
        <SkeletonBlock className="h-11 w-11" rounded="rounded-full" />
        <SkeletonBlock className="h-11 w-11" rounded="rounded-full" />
        <SkeletonBlock className="h-11 w-24" rounded="rounded-full" />
      </div>

      <SkeletonRows count={6} />
    </RouteSkeleton>
  );
}
