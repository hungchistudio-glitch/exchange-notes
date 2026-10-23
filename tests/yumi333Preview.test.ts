import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SHOP_ITEMS, cleanOutfit, type YumiOutfit } from "@/lib/shop/catalog";
import { PROPOSALS_333 } from "@/lib/shop/proposals/catalog333";
import { createOutfitRig, disposeObject } from "@/lib/yumi3d/outfit";
import { PREVIEW_333 } from "@/lib/yumi3d/proposal333";

/* =========================================================
   Station 33 · 333: the proposals and their ten samples

   113 proposed pieces (58 Orbital Atelier, 55 Deep Space Treasures) and
   ten built on the real rig for the design review. What must hold while
   they are proposals:

     - the list is whole, unique, named in all five languages, priced in
       a tier the same slot already uses, and none of it in the live 220;
     - the rig refuses their ids unless a page opts in with PREVIEW_333,
       so no saved outfit or shop can put one on;
     - each sample builds, stays inside the 20,000-triangle budget, hangs
       where its slot hangs, and comes off without leaking — including a
       piece removed while its shaders are still compiling.
   ========================================================= */

function rigParts() {
  return {
    model: new THREE.Group(),
    eyeGroup: new THREE.Group(),
    lookGroup: new THREE.Group(),
    pupil: new THREE.Mesh(),
    shellMaterial: new THREE.MeshPhysicalMaterial(),
  };
}

/** jsdom has no 2D canvas; painted finishes only need one to draw into. */
function stubCanvas() {
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, {
    get: (_target, key) => (key === "createLinearGradient" ? () => gradient : () => {}),
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as CanvasRenderingContext2D);
}

function triangles(object: THREE.Object3D) {
  let count = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      count += (child.geometry.index?.count ?? child.geometry.attributes.position.count) / 3;
    }
  });
  return count;
}

afterEach(() => vi.restoreAllMocks());

describe("the 113 proposals", () => {
  it("are 58 + 55, unique, in all twelve slots, and none of them already for sale", () => {
    expect(SHOP_ITEMS).toHaveLength(220);
    expect(PROPOSALS_333.filter((item) => item.collection === "orbital")).toHaveLength(58);
    expect(PROPOSALS_333.filter((item) => item.collection === "space")).toHaveLength(55);
    expect(new Set(PROPOSALS_333.map((item) => item.id)).size).toBe(113);
    expect(new Set(PROPOSALS_333.map((item) => item.names.english)).size).toBe(113);
    expect(new Set(PROPOSALS_333.map((item) => item.slot)).size).toBe(12);

    for (const item of PROPOSALS_333) {
      expect(SHOP_ITEMS.some((live) => live.id === item.id || live.names.english === item.names.english), item.id).toBe(false);
    }
  });

  it("are named in all five languages and priced in a tier their slot already uses", () => {
    for (const item of PROPOSALS_333) {
      expect(Object.keys(item.names), item.id).toHaveLength(5);
      expect(Object.values(item.names).every(Boolean), item.id).toBe(true);
      expect(item.price % 3, item.id).toBe(0);
      expect(SHOP_ITEMS.some((live) => live.slot === item.slot && live.price === item.price), item.id).toBe(true);
    }
  });
});

describe("the ten samples on the rig", () => {
  it("are refused without the review's explicit opt-in", () => {
    const outfit = Object.fromEntries(PREVIEW_333.items.map((item) => [item.slot, item.id]));
    expect(cleanOutfit(outfit)).toEqual({});

    const parts = rigParts();
    const rig = createOutfitRig(parts);
    expect(rig.apply(outfit)).toEqual([]);
    expect(rig.hasShellFinish()).toBe(false);
    rig.dispose();
  });

  it("each build, stay within budget, sit where their slot hangs and come off cleanly", () => {
    stubCanvas();
    expect(PREVIEW_333.items).toHaveLength(10);

    for (const item of PREVIEW_333.items) {
      const parts = rigParts();
      const rig = createOutfitRig({ ...parts, previewCollection: PREVIEW_333 });
      const objects = rig.apply({ [item.slot]: item.id });

      if (item.slot === "material") {
        expect(rig.hasShellFinish(), item.id).toBe(true);
        expect(parts.shellMaterial.map, item.id).not.toBeNull();
      } else {
        expect(objects, item.id).toHaveLength(1);
        const bounds = new THREE.Box3().setFromObject(objects[0]);
        expect(bounds.isEmpty(), item.id).toBe(false);
        objects[0].traverse((child) => {
          if (child instanceof THREE.Mesh) {
            expect(Array.from(child.geometry.attributes.position.array).every(Number.isFinite), item.id).toBe(true);
          }
        });
        expect(triangles(objects[0]), item.id).toBeLessThan(20000);
        /* Single earrings hang on Yumi's left only. */
        if (item.slot === "earrings") expect(bounds.max.x, item.id).toBeLessThan(-0.8);
      }

      rig.apply({});
      expect(parts.model.children, item.id).toHaveLength(0);
      expect(rig.hasShellFinish(), item.id).toBe(false);
      rig.dispose();
      expect(parts.eyeGroup.children, item.id).toHaveLength(0);
    }
  });

  it("hang earrings from their top ring at the origin", () => {
    for (const [id, build] of Object.entries(PREVIEW_333.builders.earrings ?? {})) {
      const piece = build();
      expect(new THREE.Box3().setFromObject(piece).max.y, id).toBeCloseTo(0, 2);
      disposeObject(piece);
    }
  });

  it("mix across both collections, and wait for compiling shaders before disposing", async () => {
    stubCanvas();
    let settle!: () => void;
    const compiling = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const parts = rigParts();
    const rig = createOutfitRig({ ...parts, previewCollection: PREVIEW_333, settling: () => compiling });

    const outfit: YumiOutfit = {
      earrings: "p333-orbital-zellige",
      necklace: "p333-space-europa",
      material: "p333-space-neptune-ice",
      head: "p333-orbital-woven-canopy",
    };
    const objects = rig.apply(outfit);
    expect(objects).toHaveLength(3);
    expect(rig.apply(outfit)).toHaveLength(0);

    let geometry: THREE.BufferGeometry | undefined;
    objects[0].traverse((child) => {
      if (child instanceof THREE.Mesh) geometry = child.geometry;
    });
    const dispose = vi.spyOn(geometry!, "dispose");

    rig.apply({});
    expect(parts.model.children).toHaveLength(0);
    expect(dispose).not.toHaveBeenCalled();

    settle();
    await compiling;
    await Promise.resolve();
    expect(dispose).toHaveBeenCalled();
    rig.dispose();
  });
});
