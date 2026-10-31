import { RouteSkeleton, SkeletonBlock, SkeletonRows } from "@/components/foundation/layout/RouteSkeleton";

export default function ArrivalReviewLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-40" rounded="rounded-full" />
      <SkeletonBlock className="mt-5 h-[52px] w-full" rounded="rounded-full" />
      <SkeletonRows count={5} />
    </RouteSkeleton>
  );
}
