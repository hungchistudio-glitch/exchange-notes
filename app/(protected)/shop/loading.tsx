import {
  RouteSkeleton,
  SkeletonBlock,
} from "@/components/foundation/layout/RouteSkeleton";

/** The stand, then two rows of cards. */
export default function ShopLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-32" rounded="rounded-full" />
      <SkeletonBlock className="mt-4 h-[260px] w-full" rounded="rounded-[28px]" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-44 w-full" rounded="rounded-[20px]" />
        <SkeletonBlock className="h-44 w-full" rounded="rounded-[20px]" />
      </div>
    </RouteSkeleton>
  );
}
