/* =========================================================
   Springs, as curves the compositor can play
   (Chi, 2026-11-22: 彈簧曲線系統, from the "premium animations" notes)

   A closed-form damped spring, from rest at 0 to rest at 1:

     x(t) = 1 − e^(−ζωt) · (cos(ω_d t) + (ζω / ω_d) · sin(ω_d t))

   with ω = 2πf and ω_d = ω·√(1 − ζ²). f is how many times a second it
   would swing undamped; ζ how quickly the swing dies (1 is no overshoot).

   Sampled into CSS `linear()`, a spring is an easing like any other: a
   transition or a Web Animation of transform or opacity still runs on the
   compositor, and the curve may pass 1 and come back, which is the
   overshoot. The duration is the time it takes to settle within half a
   percent, so nothing ends on a visible jump.

   Three, so the app has one vocabulary:
   - pop: a chip, a badge, a toast arriving. Visible overshoot.
   - settle: something moving into place on screen. A little overshoot.
   - sheet: a sheet or a heavy panel. Barely any.

   The same values are written out in app/globals.css as --spring-*; a test
   keeps the two equal. Browsers without linear() (Safari before 17.2) get
   the strong ease-out instead.
   ========================================================= */

export type Spring = {
  /** Undamped swings per second. */
  frequency: number;
  /** 0–1; lower swings more. */
  damping: number;
};

export const SPRINGS = {
  pop: { frequency: 2.3, damping: 0.42 },
  settle: { frequency: 1.9, damping: 0.62 },
  sheet: { frequency: 2.2, damping: 0.84 },
} as const satisfies Record<string, Spring>;

export type SpringName = keyof typeof SPRINGS;

/** Where the spring is at `t` seconds, 0 → 1. */
export function springAt(t: number, { frequency, damping }: Spring) {
  if (t <= 0) return 0;
  const omega = 2 * Math.PI * frequency;
  const zeta = Math.min(0.999, Math.max(0.01, damping));
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * t);
  return 1 - decay * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t));
}

/** Seconds until it stays within `tolerance` of rest. */
export function settleTime(spring: Spring, tolerance = 0.005) {
  /* The envelope e^(−ζωt)·√(1 + (ζω/ω_d)²) bounds the swing; past it, so is x. */
  const omega = 2 * Math.PI * spring.frequency;
  const zeta = Math.min(0.999, Math.max(0.01, spring.damping));
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  const amplitude = Math.sqrt(1 + ((zeta * omega) / omegaD) ** 2);
  return Math.log(amplitude / tolerance) / (zeta * omega);
}

/** The largest value the spring reaches: 1 plus its overshoot. */
export function springPeak(spring: Spring) {
  const zeta = Math.min(0.999, Math.max(0.01, spring.damping));
  return 1 + Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
}

/**
 * The spring as a CSS `linear()` easing and the duration it needs, in ms.
 * Points are spaced more closely where it moves fastest, early on.
 */
export function springEasing(spring: Spring, points = 36) {
  const duration = settleTime(spring);
  const stops: string[] = [];
  for (let i = 0; i <= points; i++) {
    /* Squared spacing: dense at the start, where the curve is steep. */
    const p = (i / points) ** 1.6;
    const value = i === points ? 1 : springAt(p * duration, spring);
    stops.push(i === 0 || i === points ? `${value === 0 ? 0 : 1}` : `${value.toFixed(4)} ${(p * 100).toFixed(2)}%`);
  }
  return { easing: `linear(${stops.join(", ")})`, durationMs: Math.round(duration * 1000) };
}

let linearSupported: boolean | null = null;

/** Whether this browser takes `linear()` easings. */
export function supportsLinearEasing() {
  if (linearSupported !== null) return linearSupported;
  linearSupported = typeof CSS !== "undefined"
    && typeof CSS.supports === "function"
    && CSS.supports("transition-timing-function", "linear(0, 1)");
  return linearSupported;
}

/** The strong ease-out (app/globals.css --ease-out), where linear() is not there. */
const FALLBACK = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Timing for a Web Animation driven by the named spring. */
export function springTiming(name: SpringName, extra: KeyframeAnimationOptions = {}): KeyframeAnimationOptions {
  const { easing, durationMs } = springEasing(SPRINGS[name]);
  return supportsLinearEasing()
    ? { duration: durationMs, easing, ...extra }
    : { duration: Math.round(durationMs * 0.6), easing: FALLBACK, ...extra };
}
