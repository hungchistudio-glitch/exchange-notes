import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/** A list of conversations. */
export default function MessagesLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-36" rounded="rounded-full" />
      <SkeletonBlock className="mt-5 h-[52px] w-full" rounded="rounded-full" />
      <SkeletonRows count={7} height="h-[72px]" />
    </RouteSkeleton>
  );
}
