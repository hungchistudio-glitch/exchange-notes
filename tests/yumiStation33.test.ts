import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SHOP_ITEMS, type ShopSlot, type YumiOutfit } from "@/lib/shop/catalog";
import { buildThumbnailObject, createOutfitRig, disposeObject } from "@/lib/yumi3d/outfit";
import { STATION33_CHARM, STATION33_EARRINGS, STATION33_MOUTH } from "@/lib/yumi3d/station33Outfit";

/* =========================================================
   Station 33, the second collection (2026-10-17)

   The design book's rules, held here: every piece is built and bounded,
   the hanging ones are held by their ring (nothing floats below a gap),
   the earring is one earring, a whole outfit goes on and comes off without
   leaving anything behind, and a piece still compiling when it comes off
   is not disposed under the renderer.
   ========================================================= */

afterEach(() => vi.restoreAllMocks());

/** jsdom has no 2D canvas: every call is accepted and nothing is drawn. */
function canvas() {
  const gradient = { addColorStop() {} };
  const context: Record<string | symbol, unknown> = new Proxy({}, {
    get: (_target, name) =>
      name === "createRadialGradient" || name === "createLinearGradient" ? () => gradient
        : name === "getImageData" || name === "createImageData" ? () => ({ data: new Uint8ClampedArray(4) })
          : () => {},
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
}

const STATION = SHOP_ITEMS.filter(item => item.id.startsWith("s33-"));

function rigParts() {
  return {
    model: new THREE.Group(), eyeGroup: new THREE.Group(), lookGroup: new THREE.Group(),
    pupil: new THREE.Mesh(), shellMaterial: new THREE.MeshPhysicalMaterial(),
  };
}

describe("Station 33", () => {
  it("builds every piece as finite, bounded geometry, and disposes it", () => {
    canvas();
    for (const item of STATION) {
      const object = buildThumbnailObject(item.id);
      expect(object, item.id).not.toBeNull();
      const size = new THREE.Box3().setFromObject(object!).getSize(new THREE.Vector3());
      expect([size.x, size.y, size.z].every(x => Number.isFinite(x) && x > 0 && x < 6), item.id).toBe(true);
      let triangles = 0;
      object!.traverse(child => {
        if (child instanceof THREE.Mesh) triangles += (child.geometry.index?.count ?? child.geometry.attributes.position.count) / 3;
      });
      // A phone draws the whole outfit every frame: no piece gets to be heavy.
      expect(triangles, item.id).toBeLessThan(20000);
      disposeObject(object!);
    }
  });

  it("hangs every mouth piece, charm and earring from a ring at its top", () => {
    canvas();
    for (const [id, build] of Object.entries({ ...STATION33_MOUTH, ...STATION33_CHARM, ...STATION33_EARRINGS })) {
      const piece = build();
      const box = new THREE.Box3().setFromObject(piece);
      // Its top is where the chain ends: no gap above it, nothing above it.
      expect(box.max.y, id).toBeLessThanOrEqual(0.02);
      expect(box.max.y, id).toBeGreaterThan(-0.02);
      expect(box.min.y, id).toBeLessThan(-0.3);
      disposeObject(piece);
    }
  });

  it("wears one earring, on one side", () => {
    canvas();
    for (const item of STATION.filter(item => item.slot === "earrings")) {
      const parts = rigParts();
      const rig = createOutfitRig(parts);
      const added = rig.apply({ earrings: item.id });
      expect(added, item.id).toHaveLength(1);
      // Everything is on her left: the cuff, the chain and the drop.
      const box = new THREE.Box3().setFromObject(parts.model);
      expect(box.max.x, item.id).toBeLessThan(-0.8);
      rig.dispose();
      parts.shellMaterial.dispose();
    }
  });

  it("puts a whole outfit on and takes all of it off again", () => {
    canvas();
    const parts = rigParts();
    const rig = createOutfitRig(parts);
    for (const index of [0, 1, 2]) {
      const outfit: YumiOutfit = {};
      for (const slot of new Set(STATION.map(item => item.slot)) as Set<ShopSlot>) {
        outfit[slot] = STATION.filter(item => item.slot === slot)[index].id;
      }
      rig.apply(outfit);
      expect(Object.keys(outfit)).toHaveLength(12);
      expect(rig.hasShellFinish()).toBe(true);
      expect(parts.model.children.length).toBeGreaterThan(5);
    }
    rig.apply({});
    expect(parts.model.children).toHaveLength(0);
    expect(parts.lookGroup.children).toHaveLength(0);
    expect(parts.eyeGroup.children[0].children).toHaveLength(0);
    expect(rig.hasShellFinish()).toBe(false);
    rig.dispose();
    parts.shellMaterial.dispose();
  });

  it("does not dispose a piece while its shaders are still compiling", async () => {
    canvas();
    let finish!: () => void;
    const compiling = new Promise<void>(resolve => { finish = resolve; });
    const parts = rigParts();
    const rig = createOutfitRig({ ...parts, settling: () => compiling });
    const [piece] = rig.apply({ head: "s33-tea-cone" });
    const geometries: THREE.BufferGeometry[] = [];
    piece.traverse(child => { if (child instanceof THREE.Mesh) geometries.push(child.geometry); });
    const disposed = geometries.map(g => vi.spyOn(g, "dispose"));

    // Taken off at once…
    rig.apply({ head: "s33-flight-cap" });
    expect(piece.parent).toBeNull();
    expect(disposed.some(spy => spy.mock.calls.length > 0)).toBe(false);
    // …and disposed only once its compile has settled.
    finish();
    await compiling;
    await Promise.resolve();
    expect(disposed.every(spy => spy.mock.calls.length > 0)).toBe(true);
    rig.dispose();
    parts.shellMaterial.dispose();
  });
});
