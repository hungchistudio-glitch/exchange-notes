import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildEarmuffsPiece, createOutfitRig } from "@/lib/yumi3d/outfit";

/* =========================================================
   Yumi listening, and Yumi not able to (Chi, 2026-11-27)

   While a microphone listens her pupil opens with the voice; while the
   page has no microphone she wears earmuffs over whatever is on her head.
   Neither is a shop piece, and both must leave her outfit as it was.
   ========================================================= */

afterEach(() => vi.restoreAllMocks());

function canvas() {
  // Every drawing call a texture painter makes is a no-op; gradients too.
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, {
    get: (_target, name) => (name === "createRadialGradient" || name === "createLinearGradient" ? () => gradient : () => undefined),
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
}

function rig() {
  canvas();
  const model = new THREE.Group();
  const eyeGroup = new THREE.Group();
  const lookGroup = new THREE.Group();
  const pupil = new THREE.Mesh();
  const shellMaterial = new THREE.MeshPhysicalMaterial();
  return { model, pupil, rig: createOutfitRig({ model, eyeGroup, lookGroup, pupil, shellMaterial }) };
}

describe("her earmuffs", () => {
  it("are one light piece on her head's mount", () => {
    const piece = buildEarmuffsPiece();
    let triangles = 0;
    piece.traverse(child => {
      if (child instanceof THREE.Mesh) triangles += (child.geometry.index?.count ?? child.geometry.attributes.position.count) / 3;
    });
    expect(triangles).toBeGreaterThan(0);
    expect(triangles).toBeLessThan(20_000);
    expect(piece.userData.yumiEarmuffs).toBe(true);
    // The fluff never splits along the sphere's seams: every corner moved once.
    const muff = piece.children[0].children[1].children[0] as THREE.Mesh;
    expect(muff.geometry.attributes.normal.count).toBe(muff.geometry.attributes.position.count);
  });

  it("go on over her hat, which comes back when they come off", () => {
    const { model, rig: outfit } = rig();
    outfit.apply({ head: "headphones" });
    const hat = model.children[0];
    outfit.setVisible(true);
    expect(hat.visible).toBe(true);

    outfit.setHeadHidden(true);
    outfit.setVisible(true);
    expect(hat.visible).toBe(false);

    outfit.setHeadHidden(false);
    outfit.setVisible(true);
    expect(hat.visible).toBe(true);
    outfit.dispose();
  });
});

describe("her pupil while she listens", () => {
  it("opens from where it rests, and an iris still narrows it", () => {
    const { pupil, rig: outfit } = rig();
    outfit.apply({});
    outfit.setDilation(1.3);
    expect(pupil.scale.x).toBeCloseTo(1.3);

    outfit.apply({ iris: "lake-iris" });
    expect(pupil.scale.x).toBeCloseTo(0.72 * 1.3);

    outfit.setDilation(1);
    expect(pupil.scale.x).toBeCloseTo(0.72);
    outfit.dispose();
  });
});
