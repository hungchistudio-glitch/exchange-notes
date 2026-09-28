import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/** The title, then the collections. */
export default function CollectionsLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-40" rounded="rounded-full" />
      <SkeletonRows count={5} />
    </RouteSkeleton>
  );
}
