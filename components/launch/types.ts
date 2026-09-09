import type { ComponentType } from "react";

/** Controls shared by every opening-animation implementation. */
export type LaunchExperienceProps = {
  /** Renders its review controls and does not hand over automatically. */
  reviewMode?: boolean;
  /** Fires after the exit transition, when the implementation can unmount. */
  onComplete?: () => void;
};

/** Internal props supplied by the active-animation adapter. */
export type LaunchRendererProps = LaunchExperienceProps & {
  launchId: string;
};

/**
 * The small contract a replacement opening must satisfy.
 *
 * Keeping the selection here means a new visual can replace the current one
 * without changing authentication, the protected layout, or the review URL.
 */
export type LaunchExperienceDefinition = Readonly<{
  id: string;
  durationMs: number;
  Component: ComponentType<LaunchRendererProps>;
}>;
