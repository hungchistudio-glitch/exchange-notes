/* =========================================================
   A ripple in the floor Yumi is reflected in (Chi, 2026-11-22: 地板漣漪)

   The letter capsules live in their own canvas and Yumi's floor in hers,
   so a capsule crossing her floor line says so on the window, and the
   home's scene answers with a ripple there (lib/yumi3d/ground.ts). A touch
   on Yumi ripples the floor from inside her own scene, with no event.
   ========================================================= */

export const YUMI_FLOOR_RIPPLE = "yumi-floor-ripple";

export type FloorRippleDetail = {
  /** Where along the floor, in viewport CSS px. */
  x: number;
  /** 0..1: how hard it crossed. */
  strength: number;
};
