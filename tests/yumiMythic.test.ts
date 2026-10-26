import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SHOP_ITEMS, cleanOutfit, shopItem } from "@/lib/shop/catalog";
import { MYTHIC_ITEMS, isMythic } from "@/lib/shop/mythicCollection";
import {
  MYTHIC_CHARM, MYTHIC_EARRINGS, MYTHIC_EYEWEAR, MYTHIC_FINISHES, MYTHIC_MOUTH,
} from "@/lib/yumi3d/mythicOutfit";
import { applyShellFinish, buildThumbnailObject, buildableIds, createOutfitRig, disposeObject } from "@/lib/yumi3d/outfit";

/* =========================================================
   The Mythic Vault: 33 limited pieces (Chi, 2026-10-26)

   Won only from Wordvault's premium chest; never on the 333 shelves;
   worn like any other piece once owned. What must hold:
     - 33, apart from the 333, five names each, the Chinese Traditional;
     - every one builds on the real rig inside the phone's budget;
     - hanging pieces hang from the attachment point, the earring on the
       left only, lenses in front of the eye;
     - the database row for each (the migration) says limited and not for
       sale, in the right slot;
     - all 33 go on and come off, leaving nothing behind.
   ========================================================= */

afterEach(() => vi.restoreAllMocks());

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

const SIMPLIFIED = /[们这说时为国过还样学发经么见对东头长门问间车马鸟爱当会实现进运动电话请让认识书买卖习写读农业应该个开关钱觉听语区难题欢视务观热办体图华广场备岁变权传营节约师乐号产将处圣复无与气龙凤]/;

describe("the vault's catalogue", () => {
  it("holds 33 pieces apart from the 333 on the shelves", () => {
    expect(MYTHIC_ITEMS).toHaveLength(33);
    expect(new Set(MYTHIC_ITEMS.map(item => item.id)).size).toBe(33);
    expect(SHOP_ITEMS).toHaveLength(333);
    expect(SHOP_ITEMS.some(item => isMythic(item.id))).toBe(false);
    for (const item of MYTHIC_ITEMS) {
      expect(item.id.startsWith("myth-"), item.id).toBe(true);
      expect(Object.values(item.names).filter(name => name.trim()), item.id).toHaveLength(5);
      expect(SIMPLIFIED.test(item.names["traditional-chinese"]), item.names["traditional-chinese"]).toBe(false);
    }
  });

  it("is worn like any other piece once owned", () => {
    expect(shopItem("myth-phoenix-crown")?.slot).toBe("head");
    expect(cleanOutfit({ head: "myth-phoenix-crown", necklace: "myth-brisingamen" })).toEqual({
      head: "myth-phoenix-crown", necklace: "myth-brisingamen",
    });
  });

  it("matches the database: every piece limited, in its slot, never for sale", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(__dirname, "..", "supabase", "migrations");
    const file = readdirSync(dir).find(name => name.endsWith("_wordvault_chests_and_mythic_pieces.sql"))!;
    const sql = readFileSync(join(dir, file), "utf8");
    const rows = [...sql.matchAll(/\('(myth-[a-z-]+)', '([a-z]+)', (\d+), (true|false), (true|false)\)/g)];
    expect(new Map(rows.map(([, id, slot]) => [id, slot]))).toEqual(new Map(MYTHIC_ITEMS.map(item => [item.id, item.slot])));
    for (const [, id, , , available, limited] of rows) {
      expect([available, limited], id).toEqual(["false", "true"]);
    }
  });
});

describe("on the rig", () => {
  it("builds every piece with finite, bounded geometry inside the phone's budget", () => {
    stubCanvas();
    const buildable = new Set(buildableIds());
    for (const item of MYTHIC_ITEMS) {
      expect(buildable.has(item.id), item.id).toBe(true);
      if (item.slot === "material") {
        expect(MYTHIC_FINISHES[item.id], item.id).toBeDefined();
        continue;
      }
      const object = buildThumbnailObject(item.id);
      expect(object, item.id).not.toBeNull();
      const size = new THREE.Box3().setFromObject(object!).getSize(new THREE.Vector3());
      expect([size.x, size.y, size.z].every(value => Number.isFinite(value) && value > 0 && value < 6), item.id).toBe(true);
      let triangles = 0;
      object!.traverse(child => {
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
    for (const [id, build] of Object.entries({ ...MYTHIC_EARRINGS, ...MYTHIC_MOUTH, ...MYTHIC_CHARM })) {
      const object = build();
      const top = new THREE.Box3().setFromObject(object).max.y;
      expect(top, id).toBeLessThanOrEqual(0.02);
      expect(top, id).toBeGreaterThan(-0.02);
      disposeObject(object);
    }
  });

  it("wears a single earring, on Yumi's left", () => {
    stubCanvas();
    for (const id of Object.keys(MYTHIC_EARRINGS)) {
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
    for (const [id, build] of Object.entries(MYTHIC_EYEWEAR)) {
      const object = build();
      expect(new THREE.Box3().setFromObject(object).min.z, id).toBeGreaterThan(0.3);
      disposeObject(object);
    }
  });

  it("sets each finish, and resets it", () => {
    stubCanvas();
    const material = new THREE.MeshPhysicalMaterial();
    applyShellFinish(material, "myth-bifrost-frost");
    expect(material.iridescence).toBeGreaterThan(0);
    applyShellFinish(material, "myth-nile-lapis");
    expect(material.metalnessMap).not.toBeNull();
    applyShellFinish(material, undefined);
    expect(material.map).toBeNull();
    expect(material.iridescence).toBe(0);
    material.dispose();
  });

  it("puts all 33 on and takes them off in quick succession, leaving nothing", () => {
    stubCanvas();
    const parts = rigParts();
    const rig = createOutfitRig(parts);
    for (const item of MYTHIC_ITEMS) {
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
