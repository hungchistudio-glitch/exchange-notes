import {
  RouteSkeleton,
  SkeletonBlock,
} from "@/components/foundation/layout/RouteSkeleton";

/** The title, then the frame the menu will be read into. */
export default function MenuScannerLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-32" rounded="rounded-full" />
      <SkeletonBlock className="mt-6 h-[420px] w-full" rounded="rounded-3xl" />
    </RouteSkeleton>
  );
}
