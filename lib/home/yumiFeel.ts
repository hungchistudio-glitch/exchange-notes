import { deviceTilt, shakeReader, watchDeviceMotion } from "@/lib/home/deviceMotion";

/* The two homes load this with her scene, not with the page (it keeps
   home's first load as small as tests/routeImportWeight.test.ts allows),
   so what they need of the phone's motion comes through here. */
export { enableDeviceMotion } from "@/lib/home/deviceMotion";
export { YUMI_FLOOR_RIPPLE } from "@/lib/home/floorRipple";

/* =========================================================
   Yumi feels the phone too (Chi, 2026-11-22: Yumi 也感受得到傾斜)

   Tip the phone and she leans a little the way it went, her eye drifting
   to the low side, as the capsules drift. Shake it hard for a moment and
   she is dizzy: her eye rolls round twice and she sways, then she is
   herself again. A gentle shake only jostles the capsules.

   Both homes use it; each passes what it gets into her scene's own gaze
   and lean, and only when nothing else has her attention (the dial, a
   cookie she is eyeing, the search). Off with the device's motion setting
   (lib/home/deviceMotion.ts), and never under reduced motion.
   ========================================================= */

/** How much shaking, in m/s of jolt gathered and leaking away, makes her dizzy. */
const DIZZY_AT = 6;
const LEAK = 1.5;
const DIZZY_MS = 1500;

export type YumiFeeling = {
  /** Where her eye wants to go, -1..1, or null when the phone has nothing to say. */
  gaze: { x: number; y: number } | null;
  /** Her lean, radians (the scene keeps it small). */
  lean: number;
  dizzy: boolean;
};

export function createYumiFeel(reducedMotion: boolean) {
  const stopWatching = watchDeviceMotion();
  const jolts = shakeReader();
  let energy = 0;
  let dizzySince = -Infinity;
  const calm: YumiFeeling = { gaze: null, lean: 0, dizzy: false };

  return {
    /** Once a frame. */
    step(now: number, dt: number): YumiFeeling {
      const jolt = jolts.take();
      if (reducedMotion) return calm;
      energy = energy * Math.exp(-dt * LEAK) + Math.hypot(jolt.x, jolt.y);
      if (energy > DIZZY_AT && now - dizzySince > DIZZY_MS + 600) {
        dizzySince = now;
        energy = 0;
      }
      const since = now - dizzySince;
      if (since < DIZZY_MS) {
        /* Two turns of the eye, easing out, and a sway with it. */
        const settle = 1 - since / DIZZY_MS;
        const turn = (since / 1000) * Math.PI * 2 * 1.4;
        return {
          gaze: { x: Math.cos(turn) * 0.85 * settle, y: Math.sin(turn) * 0.85 * settle },
          lean: Math.sin(turn) * 0.04 * settle,
          dizzy: true,
        };
      }
      if (!deviceTilt.live || Math.hypot(deviceTilt.x, deviceTilt.y) < 0.04) return calm;
      return {
        gaze: {
          x: Math.max(-0.9, Math.min(0.9, deviceTilt.x * 1.3)),
          y: Math.max(-0.9, Math.min(0.9, deviceTilt.y * 1.3)),
        },
        /* Toward the low side, as something hanging would. */
        lean: -deviceTilt.x * 0.06,
        dizzy: false,
      };
    },
    dispose() {
      jolts.dispose();
      stopWatching();
    },
  };
}
