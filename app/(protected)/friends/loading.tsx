import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/** The title and search field, then people. */
export default function FriendsLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-32" rounded="rounded-full" />
      <SkeletonBlock className="mt-5 h-[52px] w-full" rounded="rounded-full" />
      <SkeletonRows count={5} height="h-[64px]" />
    </RouteSkeleton>
  );
}
