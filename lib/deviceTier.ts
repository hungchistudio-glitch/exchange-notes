/**
 * How much the device can afford to spend on decoration.
 *
 * Only two answers, and only one of them is ever acted on: a device is
 * "modest" when it has told us something that says so, and "capable"
 * otherwise. Nothing is inferred from silence — a browser that reports
 * neither core count nor memory keeps the full treatment, because guessing
 * wrong in that direction takes an effect away from a phone that could have
 * rendered it, and nobody can see what they are not being shown.
 */
export type DeviceTier = "capable" | "modest";

/*
 * Two cores or fewer, or four gigabytes or less.
 *
 * The two thresholds are deliberately lopsided because the two signals are
 * not equally informative. `deviceMemory` is Chromium-only and is where most
 * Android phones answer; four gigabytes there is a genuinely modest phone.
 * `hardwareConcurrency` is the one Safari reports, but it is also what a
 * perfectly capable four-core laptop reports, so only a count low enough to
 * mean an old phone counts — iPhones of the last several years say six,
 * while the A9 and A10 generations say two.
 *
 * Either signal on its own is enough.
 */
const MODEST_CORES = 2;
const MODEST_MEMORY_GB = 4;

/**
 * The source of the inline script that stamps the tier before the first paint.
 *
 * Inline and synchronous rather than an effect: this decides whether two
 * pieces of permanent chrome are blurred, and reaching that conclusion after
 * hydration would mean the reader watches the header change.
 */
export const DEVICE_TIER_SCRIPT = `
(function () {
  try {
    var n = navigator;
    var cores = n.hardwareConcurrency;
    var memory = n.deviceMemory;
    var modest =
      (typeof cores === "number" && cores > 0 && cores <= ${MODEST_CORES}) ||
      (typeof memory === "number" && memory > 0 && memory <= ${MODEST_MEMORY_GB});

    document.documentElement.dataset.deviceTier = modest ? "modest" : "capable";
  } catch (error) {
    document.documentElement.dataset.deviceTier = "capable";
  }
})();
`.trim();

/** The same decision, for anything that needs it in JavaScript. */
export function readDeviceTier(): DeviceTier {
  if (typeof document === "undefined") return "capable";

  return document.documentElement.dataset.deviceTier === "modest"
    ? "modest"
    : "capable";
}
