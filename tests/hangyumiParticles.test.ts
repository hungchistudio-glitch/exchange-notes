import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { createGrains, type Grain } from "@/lib/hangyumi/particles";

/* =========================================================
   The sand Yumi becomes, and the glints she leaves

   Each grain waits where it starts until the wind's front reaches it,
   then is carried off, fading, and is gone once its life is spent; the
   pool says when nothing is left so the studio can stop drawing.
   ========================================================= */

const grain = (release: number, life = 1): Grain => ({
  at: new THREE.Vector3(1, 2, 0),
  velocity: new THREE.Vector3(1, 0, 0),
  acceleration: new THREE.Vector3(0, 0, 0),
  release,
  life,
  size: 0.1,
  from: new THREE.Color(0x000000),
  to: new THREE.Color(0xffffff),
  drift: 0,
});

describe("Hangyumi's grains", () => {
  it("wait unseen where they start until released, then drift, fade and go", () => {
    const pool = createGrains(8);
    pool.load([grain(0), grain(0.5)]);
    const alpha = pool.points.geometry.getAttribute("alpha");
    const position = pool.points.geometry.getAttribute("position");

    expect(pool.update(0.25, 600)).toBe(true);
    expect(alpha.getX(0)).toBeGreaterThan(0.9);
    expect(position.getX(0)).toBeCloseTo(1.25);
    // The second has not been reached yet: in place, and invisible.
    expect(alpha.getX(1)).toBe(0);
    expect(position.getX(1)).toBe(1);

    pool.update(1.2, 600);
    expect(alpha.getX(0)).toBe(0);
    expect(alpha.getX(1)).toBeGreaterThan(0);
    expect(alpha.getX(1)).toBeCloseTo(0.5);

    expect(pool.update(1.6, 600)).toBe(false);
    expect(pool.points.visible).toBe(false);
    pool.dispose();
  });

  it("drifts from its first colour to its last", () => {
    const pool = createGrains(1);
    pool.load([grain(0)]);
    const colour = pool.points.geometry.getAttribute("color");
    pool.update(0.05, 600);
    const early = colour.getX(0);
    pool.update(0.8, 600);
    expect(colour.getX(0)).toBeGreaterThan(early);
  });

  it("never holds more than it was made for", () => {
    const pool = createGrains(3);
    pool.load(Array.from({ length: 10 }, () => grain(0)));
    expect(pool.points.geometry.drawRange.count).toBe(3);
  });
});
