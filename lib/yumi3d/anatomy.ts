import * as THREE from "three";

/* =========================================================
   Yumi's measurements

   Construction, read from the reference and shared with the 2D brand mark.
   The scene builds her from these; the outfit code (outfit.ts) uses the
   same numbers to put a hat on top of the shell and a scarf around it, so a
   change here moves both together.
   ========================================================= */

export const SHELL_RADIUS = 1.6;
export const TUBE_RADIUS = 0.4;
export const SHELL_DEPTH = 1.22;
export const GAP_HALF = THREE.MathUtils.degToRad(37.5);
export const EYE_RADIUS = 0.6;
export const ARM_RADIUS = 0.145;

/** The centre of the shell's tube at an angle around the C, in radians. */
export function tubeCentre(angle: number, target = new THREE.Vector3()) {
  return target.set(Math.cos(angle) * SHELL_RADIUS, Math.sin(angle) * SHELL_RADIUS, 0);
}

/** A point on the tube's outer surface, in the plane of the C. */
export function tubeOuter(angle: number, target = new THREE.Vector3()) {
  const r = SHELL_RADIUS + TUBE_RADIUS;
  return target.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
}

/** How far the tube reaches toward the viewer, scaled for its depth. */
export const TUBE_FRONT = TUBE_RADIUS * SHELL_DEPTH;
