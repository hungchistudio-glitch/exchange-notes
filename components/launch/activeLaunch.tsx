"use client";

import YumiPrismLaunch from "./YumiPrismLaunch";
import type {
  LaunchExperienceDefinition,
  LaunchExperienceProps,
} from "./types";
import { YUMI_PRISM_DURATION_MS } from "./yumiPrismTimeline";

/**
 * The one switch point for the production opening and its review route.
 * Replace this definition when the new animation is ready.
 */
export const ACTIVE_LAUNCH = {
  id: "yumi-prism-v1",
  durationMs: YUMI_PRISM_DURATION_MS,
  Component: YumiPrismLaunch,
} satisfies LaunchExperienceDefinition;

export default function ActiveLaunch(props: LaunchExperienceProps) {
  const { Component, id } = ACTIVE_LAUNCH;

  return <Component {...props} launchId={id} />;
}
