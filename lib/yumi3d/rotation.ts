import { Quaternion, Vector3 } from "three";

// A full idle revolution takes about 35 seconds; a flick settles into it.
export const ROTATION_CRUISE_SPEED = 0.18;
const MAX_RELEASE_SPEED = 2.8;
const RADIANS_PER_PIXEL = 0.012;

/** Screen-space rotation, without Euler limits or a second animation loop. */
export function createYumiRotation(orientation: Quaternion, reducedMotion = false) {
  const axis = new Vector3(0, 1, 0);
  const previousAxis = axis.clone();
  const velocity = new Vector3();
  const sample = new Vector3();
  const delta = new Quaternion();
  let held = false;
  let active = false;
  let previouslyActive = false;
  let sampled = false;
  let lastMove = 0;
  let speed = 0;

  function turn(angle: number) {
    delta.setFromAxisAngle(axis, angle);
    // Premultiply in screen axes so dragging right remains right after a flip.
    orientation.premultiply(delta).normalize();
  }

  return {
    begin(now: number) {
      held = true;
      previouslyActive = active;
      previousAxis.copy(axis);
      speed = 0;
      sampled = false;
      velocity.set(0, 0, 0);
      lastMove = now;
    },
    drag(dx: number, dy: number, now: number) {
      if (!held || (!dx && !dy)) return;
      sample.set(dy, dx, 0).multiplyScalar(RADIANS_PER_PIXEL);
      const angle = sample.length();
      axis.copy(sample).normalize();
      turn(angle);
      const dt = Math.max(1 / 240, Math.min((now - lastMove) / 1000, 0.1));
      sample.divideScalar(dt).clampLength(0, MAX_RELEASE_SPEED);
      velocity.lerp(sample, sampled ? 1 - Math.exp(-dt / 0.045) : 1);
      sampled = true;
      lastMove = now;
    },
    release(now: number, rotated: boolean) {
      held = false;
      if (!rotated || !sampled) {
        active = previouslyActive;
        axis.copy(previousAxis);
        return;
      }
      active = !reducedMotion;
      // Holding still before release drops the flick, but keeps a slow orbit.
      const recent = now - lastMove < 100;
      if (recent && velocity.lengthSq() > 0.000001) axis.copy(velocity).normalize();
      speed = active ? Math.max(ROTATION_CRUISE_SPEED, recent ? velocity.length() : 0) : 0;
    },
    cancel() {
      held = false;
      active = previouslyActive;
      axis.copy(previousAxis);
      speed = 0;
    },
    step(seconds: number, paused = false) {
      if (held || !active || reducedMotion) return;
      // Background time is never replayed as a large catch-up rotation.
      const dt = Math.max(0, Math.min(seconds, 1 / 30));
      const target = paused ? 0 : ROTATION_CRUISE_SPEED;
      const damping = paused ? 12 : 2.4;
      const decay = Math.exp(-damping * dt);
      const angle = target * dt + (speed - target) * (1 - decay) / damping;
      speed = target + (speed - target) * decay;
      if (Math.abs(angle) > 0.000001) turn(angle);
    },
  };
}
