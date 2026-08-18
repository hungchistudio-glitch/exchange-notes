/*
 * The Yumi Cosmic Signal Radar's state machine.
 *
 * Pure, and deliberately three things rather than one. The brief is explicit
 * that animation state must not become business state, and the way that goes
 * wrong is always the same: a component grows a `isSpinning` beside its
 * `isRefreshing`, the two drift, and the radar ends up spinning over a feed
 * that finished loading a second ago. So the feed's own facts come in as
 * RadarBusinessState, exactly one visual state comes out, and the motion
 * policy is applied on top without either of the first two knowing about it.
 *
 * Nothing here imports React, touches the DOM or knows what a ring is.
 */

/**
 * What the feed and the connection actually are.
 *
 * Every field is something DailyNews already tracks for its own reasons —
 * the radar reads them, it does not create them.
 */
export type RadarBusinessState = {
  online: boolean;
  /** A manual refresh the user asked for. */
  refreshing: boolean;
  /** The first load of the session, before there is anything to show. */
  loading: boolean;
  failed: boolean;
  /** True for the short window after a refresh lands. Owned by the hook. */
  succeeded: boolean;
};

/**
 * The states this radar can actually reach today.
 *
 * The brief lists nine. Four of them are absent here on purpose, and it is
 * the same discipline the Learning Core palette follows — a state with
 * nothing behind it is a visual with no meaning:
 *
 *   receiving     needs background signal detection. Discover polls only when
 *                 asked, so nothing ever arrives unbidden to acknowledge.
 *   signal_lock   needs a high-value signal indicator on the payload. The
 *                 feed does not rank or flag stories.
 *   degraded      needs a signal-quality measure. There is none.
 *
 * Each becomes one row in the priority list and one branch below on the day
 * its input exists. Until then the radar does not pretend to have it.
 */
export type RadarVisualState =
  | "offline"
  | "error"
  | "syncing"
  | "scanning"
  | "success"
  | "idle";

/*
 * The brief's priority order, minus the states above.
 *
 * Order matters more than the list does: when a refresh fails while the
 * device is also offline, the user needs to be told about the connection, not
 * about the request that could never have succeeded. Highest wins, and only
 * one state is ever live — conflicting states running their own animations at
 * once is the failure this ordering exists to prevent.
 */
const PRIORITY: RadarVisualState[] = [
  "offline",
  "error",
  "syncing",
  "scanning",
  "success",
  "idle",
];

export function resolveVisualState(
  business: RadarBusinessState,
): RadarVisualState {
  const active: Record<RadarVisualState, boolean> = {
    offline: !business.online,
    error: business.failed,
    // First load and manual refresh are genuinely different events and the
    // brief asks them to look different: syncing is the feed reconciling with
    // the server before there is anything to read, scanning is the user having
    // asked for something new while still holding what they had.
    syncing: business.loading,
    scanning: business.refreshing,
    success: business.succeeded,
    idle: true,
  };

  return PRIORITY.find((state) => active[state]) ?? "idle";
}

/**
 * How much motion the device is willing to pay for.
 *
 * Separate from the visual state so that neither has to know about the other:
 * a scanning radar is scanning whether or not it is allowed to spin, and what
 * changes is only how that is expressed.
 */
export type RadarQualityTier = "high" | "balanced" | "efficient";

export type RadarMotionPolicy = {
  tier: RadarQualityTier;
  reducedMotion: boolean;
};

/*
 * The motion budget, per tier.
 *
 * The brief caps continuous animated layers at four or five and visible
 * particles at five, and the reason is worth restating: past that the radar
 * stops reading as a precise instrument and starts reading as a screensaver.
 * These numbers are the budget the stylesheet spends, exported so the cap
 * lives next to the tiers rather than being rediscovered in CSS.
 */
export const RADAR_NODE_COUNT: Record<RadarQualityTier, number> = {
  high: 3,
  balanced: 2,
  efficient: 0,
};

/**
 * Steps a tier down to what the device is actually managing.
 *
 * The brief asks the radar to degrade when the device is thermally stressed,
 * and no browser reports that. What is reportable is frame pacing, which is
 * the thing thermal state was standing in for: a hot device throttles, a
 * throttled device drops frames, and dropped frames can be counted. See
 * hooks/discover/useFrameStability.
 *
 * Only ever downward. A device that recovered would ramp the animation back
 * up, drop frames again and oscillate, and a control that visibly hunts is
 * worse than one that stays calm.
 */
export function downgradeTier(
  tier: RadarQualityTier,
  health: "good" | "strained" | "poor",
): RadarQualityTier {
  if (health === "poor") return "efficient";
  if (health === "strained" && tier === "high") return "balanced";

  return tier;
}

/**
 * Picks a tier from what the platform is willing to tell us.
 *
 * Deliberately conservative and deliberately small. Save-Data is a direct
 * statement that the user wants less; a low core count is the best proxy a
 * browser gives for a device that will struggle. Neither is available on iOS
 * Safari, which is why reduced motion is handled separately and is the one
 * signal that is honoured everywhere.
 */
export function resolveMotionPolicy(input: {
  reducedMotion: boolean;
  saveData: boolean;
  hardwareConcurrency?: number;
}): RadarMotionPolicy {
  if (input.reducedMotion) return { tier: "efficient", reducedMotion: true };
  if (input.saveData) return { tier: "efficient", reducedMotion: false };

  const cores = input.hardwareConcurrency ?? 8;
  if (cores > 0 && cores <= 4) return { tier: "balanced", reducedMotion: false };

  return { tier: "high", reducedMotion: false };
}
