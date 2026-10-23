import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SHOP_ITEMS } from "@/lib/shop/catalog";
import { COLLECTION04_ITEMS } from "@/lib/shop/collection04";
import { inShopCollection } from "@/lib/shop/collection03Presentation";
import { COLLECTION04_FINISHES } from "@/lib/yumi3d/collection04Finishes";
import {
  COLLECTION04_CHARM,
  COLLECTION04_EARRINGS,
  COLLECTION04_EYEWEAR,
  COLLECTION04_MOUTH,
} from "@/lib/yumi3d/collection04Outfit";
import { applyShellFinish, buildThumbnailObject, createOutfitRig, disposeObject } from "@/lib/yumi3d/outfit";

/* =========================================================
   Station 33 · Collection 04: the 333 expansion

   113 pieces join the 220: 58 to Orbital Atelier, 55 to Deep Space
   Treasures, in every slot, priced in tiers the slot already uses. What
   must hold for them to be sold and worn:

     - the counts, the collections they file under, five names each;
     - every one builds on the real rig: finite, bounded, inside the
       phone's 20,000-triangle budget;
     - hanging pieces hang from the attachment point, earrings on the
       left only, lenses in front of the eye;
     - finishes set and reset every physical field;
     - all 113 go on and come off, quickly, leaving nothing behind.
   ========================================================= */

afterEach(() => vi.restoreAllMocks());

/** jsdom has no 2D canvas; painted textures only need one to draw into. */
function stubCanvas() {
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, {
    get: (_target, name) => (name === "createLinearGradient" || name === "createRadialGradient" ? () => gradient : () => {}),
    set: () => true,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as CanvasRenderingContext2D);
}

function rigParts() {
  return {
    model: new THREE.Group(),
    eyeGroup: new THREE.Group(),
    lookGroup: new THREE.Group(),
    pupil: new THREE.Mesh(),
    shellMaterial: new THREE.MeshPhysicalMaterial(),
  };
}

const SLOT_COUNTS = {
  earrings: 17, brow: 11, necklace: 12, head: 9, neck: 7, pin: 8,
  mouth: 6, charm: 7, eyewear: 6, iris: 4, pupil: 2, material: 24,
};

describe("the catalogue", () => {
  it("adds 113 pieces to the 220, 58 Orbital Atelier and 55 Deep Space Treasures", () => {
    expect(COLLECTION04_ITEMS).toHaveLength(113);
    expect(SHOP_ITEMS).toHaveLength(333);
    expect(new Set(SHOP_ITEMS.map((item) => item.id)).size).toBe(333);
    expect(COLLECTION04_ITEMS.filter((item) => inShopCollection(item, "station33"))).toHaveLength(58);
    expect(COLLECTION04_ITEMS.filter((item) => inShopCollection(item, "collection03"))).toHaveLength(55);
    expect(COLLECTION04_ITEMS.filter((item) => inShopCollection(item, "original"))).toHaveLength(0);
  });

  it("brings the three collections to 127, 94 and 112", () => {
    expect(SHOP_ITEMS.filter((item) => inShopCollection(item, "original"))).toHaveLength(127);
    expect(SHOP_ITEMS.filter((item) => inShopCollection(item, "station33"))).toHaveLength(94);
    expect(SHOP_ITEMS.filter((item) => inShopCollection(item, "collection03"))).toHaveLength(112);
  });

  it("covers every slot as planned, belongs to no country, and names each piece in five languages", () => {
    for (const [slot, count] of Object.entries(SLOT_COUNTS)) {
      expect(COLLECTION04_ITEMS.filter((item) => item.slot === slot), slot).toHaveLength(count);
    }
    for (const item of COLLECTION04_ITEMS) {
      expect(item.country, item.id).toBe("basic");
      expect(Object.values(item.names).filter((name) => name.trim()), item.id).toHaveLength(5);
      expect(item.price % 3, item.id).toBe(0);
    }
  });
});

describe("on the rig", () => {
  it("builds every piece with finite, bounded geometry inside the phone's budget", () => {
    stubCanvas();
    for (const item of COLLECTION04_ITEMS) {
      if (item.slot === "material") {
        expect(COLLECTION04_FINISHES[item.id], item.id).toBeDefined();
        continue;
      }
      const object = buildThumbnailObject(item.id);
      expect(object, item.id).not.toBeNull();
      const size = new THREE.Box3().setFromObject(object!).getSize(new THREE.Vector3());
      expect([size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0 && value < 6), item.id).toBe(true);
      let triangles = 0;
      object!.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          triangles += (child.geometry.index?.count ?? child.geometry.attributes.position.count) / 3;
          expect(Array.from(child.geometry.attributes.position.array).every(Number.isFinite), item.id).toBe(true);
        }
      });
      expect(triangles, item.id).toBeLessThan(20000);
      disposeObject(object!);
    }
  }, 30000);

  it("hangs earrings, mouth pieces and charms from the attachment point", () => {
    stubCanvas();
    for (const [id, build] of Object.entries({ ...COLLECTION04_EARRINGS, ...COLLECTION04_MOUTH, ...COLLECTION04_CHARM })) {
      const object = build();
      const top = new THREE.Box3().setFromObject(object).max.y;
      expect(top, id).toBeLessThanOrEqual(0.02);
      expect(top, id).toBeGreaterThan(-0.02);
      disposeObject(object);
    }
  });

  it("wears a single earring, on Yumi's left", () => {
    for (const id of Object.keys(COLLECTION04_EARRINGS)) {
      const parts = rigParts();
      const rig = createOutfitRig(parts);
      const objects = rig.apply({ earrings: id });
      expect(objects, id).toHaveLength(1);
      expect(new THREE.Box3().setFromObject(objects[0]).max.x, id).toBeLessThan(-0.8);
      rig.dispose();
      expect(parts.model.children, id).toHaveLength(0);
    }
  });

  it("keeps every lens in front of the eye", () => {
    for (const [id, build] of Object.entries(COLLECTION04_EYEWEAR)) {
      const object = build();
      expect(new THREE.Box3().setFromObject(object).min.z, id).toBeGreaterThan(0.3);
      disposeObject(object);
    }
  });

  it("sets and resets each finish's physical fields and textures", () => {
    stubCanvas();
    const material = new THREE.MeshPhysicalMaterial();
    applyShellFinish(material, "s33v4-orbital-motherpearl");
    expect(material.iridescence).toBeGreaterThan(0);
    applyShellFinish(material, "s33v4-orbital-moss-felt");
    expect(material.iridescence).toBe(0);
    expect(material.sheen).toBeGreaterThan(0);
    applyShellFinish(material, "s33v4-orbital-lacquer-leaf");
    expect(material.metalnessMap).not.toBeNull();
    applyShellFinish(material, undefined);
    expect(material.map).toBeNull();
    expect(material.metalnessMap).toBeNull();
    expect(material.sheen).toBe(0);
    material.dispose();
  });

  it("puts all 113 on and takes them off in quick succession, leaving nothing", () => {
    stubCanvas();
    const parts = rigParts();
    const rig = createOutfitRig(parts);
    for (const item of COLLECTION04_ITEMS) {
      rig.apply({ [item.slot]: item.id });
      rig.sync(0.016, false);
    }
    rig.apply({});
    expect(parts.model.children).toHaveLength(0);
    expect(parts.lookGroup.children).toHaveLength(0);
    rig.dispose();
    expect(parts.eyeGroup.children).toHaveLength(0);
  });
});
