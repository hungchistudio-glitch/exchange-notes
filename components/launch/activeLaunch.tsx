"use client";

import YumiMinimalLaunch from "./YumiMinimalLaunch";
import type {
  LaunchExperienceDefinition,
  LaunchExperienceProps,
} from "./types";
import { YUMI_MINIMAL_DURATION_MS } from "./yumiMinimalTimeline";

/**
 * The one switch point for the production opening and its review route.
 * Replace this definition when the new animation is ready.
 */
export const ACTIVE_LAUNCH = {
  id: "yumi-minimal-v1",
  durationMs: YUMI_MINIMAL_DURATION_MS,
  Component: YumiMinimalLaunch,
} satisfies LaunchExperienceDefinition;

export default function ActiveLaunch(props: LaunchExperienceProps) {
  const { Component, id } = ACTIVE_LAUNCH;

  return <Component {...props} launchId={id} />;
}
