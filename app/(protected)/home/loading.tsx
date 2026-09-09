import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/** Yumi's stage, then the day's cards. See RouteSkeleton for why these exist. */
export default function HomeLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-40" rounded="rounded-full" />
      <SkeletonBlock className="mt-6 h-[188px] w-full" rounded="rounded-[28px]" />
      <SkeletonRows count={3} height="h-[104px]" />
    </RouteSkeleton>
  );
}
