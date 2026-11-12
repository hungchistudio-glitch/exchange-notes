import {
  RouteSkeleton,
  SkeletonBlock,
  SkeletonRows,
} from "@/components/foundation/layout/RouteSkeleton";

import styles from "./loading.module.css";

/**
 * Yumi's stage, then the day's cards; or, in Cosmic, the obsidian bridge's
 * bar, readings, stage, search and notes. See RouteSkeleton for why these
 * exist, and loading.module.css for how the right one shows.
 */
export default function HomeLoading() {
  return (
    <RouteSkeleton>
      <div className={styles.standard}>
        <SkeletonBlock className="h-[38px] w-40" rounded="rounded-full" />
        <SkeletonBlock className="mt-6 h-[188px] w-full" rounded="rounded-[28px]" />
        <SkeletonRows count={3} height="h-[104px]" />
      </div>
      <div className={styles.cosmic}>
        <SkeletonBlock className={`${styles.bar} w-36`} rounded="rounded-full" />
        <SkeletonBlock className={`${styles.status} w-full`} rounded="rounded-2xl" />
        <SkeletonBlock className={`${styles.stage} w-full`} rounded="rounded-[22px]" />
        <SkeletonBlock className={`${styles.search} w-full`} rounded="rounded-[20px]" />
        <SkeletonBlock className={`${styles.notes} w-full`} rounded="rounded-2xl" />
      </div>
    </RouteSkeleton>
  );
}
