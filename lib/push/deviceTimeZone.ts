/**
 * The IANA zone this device believes it is in.
 *
 * Yumi's reminders are scheduled against it — quiet hours are only quiet if
 * the server and the phone agree on what hour it is. Falls back to a real
 * zone rather than UTC, because a wrong-but-plausible evening beats a
 * reminder that arrives at four in the morning.
 */
export function getDeviceTimeZone(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
    );
  } catch {
    return "America/New_York";
  }
}
