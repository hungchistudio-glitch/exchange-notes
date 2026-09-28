import {
  RouteSkeleton,
  SkeletonBlock,
} from "@/components/foundation/layout/RouteSkeleton";

/** The back key and title, then the card that is about to be turned. */
export default function ReviewLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-32" rounded="rounded-full" />
      <SkeletonBlock className="mt-6 h-[320px] w-full" rounded="rounded-3xl" />
      <div className="mt-5 flex gap-3">
        <SkeletonBlock className="h-12 flex-1" rounded="rounded-full" />
        <SkeletonBlock className="h-12 flex-1" rounded="rounded-full" />
      </div>
    </RouteSkeleton>
  );
}
