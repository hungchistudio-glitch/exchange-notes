import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

/** Avatar and name, then the settings rows. */
export default function ProfileLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-28" rounded="rounded-full" />

      <div className="mt-6 flex items-center gap-4">
        <SkeletonBlock className="h-20 w-20" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-40" rounded="rounded-full" />
          <SkeletonBlock className="h-4 w-24" rounded="rounded-full" />
        </div>
      </div>

      <SkeletonRows count={5} height="h-[60px]" />
    </RouteSkeleton>
  );
}
