import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/** One featured story above a run of smaller ones. */
export default function DiscoverLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-32" rounded="rounded-full" />
      <SkeletonBlock
        className="mt-5 aspect-[16/10] w-full"
        rounded="rounded-[24px]"
      />
      <SkeletonRows count={4} height="h-[92px]" />
    </RouteSkeleton>
  );
}
