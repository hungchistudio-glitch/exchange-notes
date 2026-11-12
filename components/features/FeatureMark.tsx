import { AudioLines, Brain, FolderHeart, ScanLine, Sparkles } from "lucide-react";
import type { ComponentType } from "react";

import { CATEGORY, type HaloCapabilityKey } from "@/lib/pet/commandHalo";

import styles from "./FeatureMark.module.css";

/** One glyph per feature: the halo's keys, the pages' titles, the way between. */
export const FEATURE_ICONS: Record<
  HaloCapabilityKey,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  review: Brain,
  add: Sparkles,
  camera: ScanLine,
  speak: AudioLines,
  // The same glyph the vocabulary toolbar already uses for collections, so
  // the halo is a second door onto a room rather than a second room.
  collect: FolderHeart,
};

const ICON_SIZE = { sm: 12, md: 17 } as const;

/**
 * A feature's mark beside its page's title (Chi, 2026-11-12: Yumi 領航).
 *
 * The key on Yumi's halo that opened the page flies here and lands on it
 * (lib/motion/featureFlight.ts finds it by `data-feature-mark`), so the
 * page says which feature it is the way the halo did: the same disc and
 * glyph, in the feature's colour in Cosmic, neutral glass in Standard.
 */
export default function FeatureMark({
  feature,
  size = "md",
  className = "",
  flightSource = false,
}: {
  feature: HaloCapabilityKey;
  size?: keyof typeof ICON_SIZE;
  className?: string;
  /** This one takes off (Daily Focus's button) rather than being landed on. */
  flightSource?: boolean;
}) {
  const Icon = FEATURE_ICONS[feature];
  return (
    <span
      className={`${styles.mark} ${className}`}
      data-size={size}
      data-category={CATEGORY[feature]}
      data-feature-mark={flightSource ? undefined : feature}
      data-flight-source={flightSource ? feature : undefined}
      aria-hidden="true"
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={1.8} />
    </span>
  );
}
