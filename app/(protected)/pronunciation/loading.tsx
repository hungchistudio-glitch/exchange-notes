import {
  RouteSkeleton,
  SkeletonBlock,
} from "@/components/foundation/layout/RouteSkeleton";

/** The title, then the practice rooms. */
export default function PronunciationLoading() {
  return (
    <RouteSkeleton>
      <SkeletonBlock className="h-[38px] w-40" rounded="rounded-full" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonBlock key={index} className="h-[120px] w-full" />
        ))}
      </div>
    </RouteSkeleton>
  );
}
