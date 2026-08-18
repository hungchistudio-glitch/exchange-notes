/*
 * The app's analytics seam.
 *
 * One function, a closed set of event names, and no provider behind it yet —
 * and that last part is the honest state of things rather than an oversight.
 * Nothing in this repo has ever sent a product event anywhere, so choosing a
 * destination is a product decision with privacy and cost attached, and it is
 * not one a component should make on the way past.
 *
 * What this does settle is everything else: which events exist, what they are
 * called, what they carry, and where they are emitted from. Those are the
 * parts that are expensive to change later, because they are spread across
 * call sites. Attaching a real sink is one function body, in one file.
 *
 * Until that happens no data leaves the device. In development the events are
 * visible in the console so the instrumentation can be checked; in production
 * the call is a no-op that the bundler can see is empty.
 */

/**
 * Every event the app emits.
 *
 * A union rather than a string, so a typo is a build error and the full list
 * is readable in one place. The radar's names are the brief's own (§41).
 */
export type AnalyticsEvent =
  | "radar.tap"
  | "radar.long_press"
  | "radar.scan_started"
  | "radar.sync_completed"
  | "radar.scan_failed"
  | "radar.offline"
  | "radar.online_restored"
  | "radar.controls_opened"
  | "radar.control_changed";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Records that something happened.
 *
 * Never throws and never awaits: a call site must be able to emit an event on
 * the way to doing its actual work without having to think about what happens
 * if telemetry is broken. That is the whole contract.
 */
export function track(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, properties ?? {});
  }

  /*
   * The sink goes here.
   *
   * Whatever it becomes, it has to keep the two promises above — swallow its
   * own failures, and never make the caller wait. A fire-and-forget POST or a
   * queue flushed on visibilitychange both qualify; an awaited request does
   * not.
   */
}
