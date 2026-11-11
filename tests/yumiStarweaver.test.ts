import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SHOP_ITEMS, cleanOutfit, itemsFor, shopItem } from "@/lib/shop/catalog";
import { MYTHIC_ITEMS } from "@/lib/shop/mythicCollection";
import { STARWEAVER_ITEMS, isStarweaver } from "@/lib/shop/starweaverCollection";
import {
  STARWEAVER_BROW, STARWEAVER_EARRINGS, STARWEAVER_FINISHES, STARWEAVER_HEAD, STARWEAVER_NECKLACE,
} from "@/lib/yumi3d/starweaverOutfit";
import { applyShellFinish, buildThumbnailObject, buildableIds, createOutfitRig, disposeObject } from "@/lib/yumi3d/outfit";

/* =========================================================
   Starwoven Relics: 17 limited pieces (Chi, 2026-11-10)

   Brought back only by Yumi Starweaver's seventh voyages; never on the 333
   shelves and apart from the Mythic Vault's 33; worn like any other piece
   once owned. What must hold (handoffs/yumi-starweaver/DESIGN.md §7):
     - 17, in the book's slots (3 finishes, 6 earrings, 3 brow, 3
       necklaces, 2 head), five names each, the Chinese Traditional;
     - the database rows (the migration) limited, unavailable, from the
       'starweaver' pool, in the same slots;
     - every one builds on the real rig, jewellery under 5,000 triangles
       and head pieces under 8,000 (20,000 is every piece's ceiling);
     - earrings hang from the attachment point and are worn singly, on
       her left; a picture ships for every one;
     - all 17 go on and come off, leaving nothing behind.
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

const SIMPLIFIED = /[们这说时为国过还样学发经么见对东头长门问间车马鸟爱当会实现进运动电话请让认识书买卖习写读农业应该个开关钱觉听语区难题欢视务观热办体图华广场备岁变权传营节约师乐号产将处圣复无与气龙凤织遗锁]/;

const triangles = (object: THREE.Object3D) => {
  let count = 0;
  object.traverse(child => {
    if (child instanceof THREE.Mesh) count += (child.geometry.index?.count ?? child.geometry.attributes.position.count) / 3;
  });
  return count;
};

describe("the relics' catalogue", () => {
  it("holds 17 pieces in the book's slots, apart from the 333 and the vault", () => {
    expect(STARWEAVER_ITEMS).toHaveLength(17);
    expect(new Set(STARWEAVER_ITEMS.map(item => item.id)).size).toBe(17);
    const slots = STARWEAVER_ITEMS.reduce<Record<string, number>>((count, item) => ({ ...count, [item.slot]: (count[item.slot] ?? 0) + 1 }), {});
    expect(slots).toEqual({ material: 3, earrings: 6, brow: 3, necklace: 3, head: 2 });
    expect(SHOP_ITEMS.some(item => isStarweaver(item.id))).toBe(false);
    expect(MYTHIC_ITEMS.some(item => isStarweaver(item.id))).toBe(false);
    expect(STARWEAVER_ITEMS.map(item => item.seal)).toEqual(Array.from({ length: 17 }, (_, i) => String(i + 1).padStart(2, "0")));
    for (const item of STARWEAVER_ITEMS) {
      expect(item.id.startsWith("sw-"), item.id).toBe(true);
      expect(Object.values(item.names).filter(name => name.trim()), item.id).toHaveLength(5);
      expect(SIMPLIFIED.test(item.names["traditional-chinese"]), item.names["traditional-chinese"]).toBe(false);
    }
  });

  it("says a line about each, in all five languages, the Chinese Traditional (Chi, 2026-11-11)", () => {
    for (const item of STARWEAVER_ITEMS) {
      const intros = Object.values(item.intro);
      expect(intros.filter(line => line.trim().length > 12), item.id).toHaveLength(5);
      expect(new Set(intros).size, item.id).toBe(5);
      expect(SIMPLIFIED.test(item.intro["traditional-chinese"]), item.intro["traditional-chinese"]).toBe(false);
      /* One or two sentences: short enough to read as it turns. */
      expect(item.intro.english.length, item.id).toBeLessThan(150);
    }
  });

  it("is worn like any other piece once owned, and listed with what is owned", () => {
    expect(shopItem("sw-aurora-visor")?.slot).toBe("head");
    expect(cleanOutfit({ head: "sw-aurora-visor", earrings: "sw-orbit-drop" })).toEqual({ head: "sw-aurora-visor", earrings: "sw-orbit-drop" });
    expect(itemsFor("owned", "all", new Set(["sw-orbit-drop"])).map(item => item.id)).toContain("sw-orbit-drop");
  });

  it("matches the database: limited, never for sale, from the starweaver pool, in its slot", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const file = readdirSync(dir).find(name => name.endsWith("_starweaver.sql"))!;
    const sql = readFileSync(join(dir, file), "utf8");
    const rows = [...sql.matchAll(/\('(sw-[a-z-]+)', '([a-z]+)', (\d+), (true|false), (true|false), '([a-z_]+)'\)/g)];
    expect(new Map(rows.map(([, id, slot]) => [id, slot]))).toEqual(new Map(STARWEAVER_ITEMS.map(item => [item.id, item.slot])));
    for (const [, id, , price, available, limited, pool] of rows) {
      expect([available, limited, pool], id).toEqual(["false", "true", "starweaver"]);
      expect(Number(price) % 3, id).toBe(0);
    }
  });
});

describe("on the rig", () => {
  it("builds every piece with finite geometry inside the budget the book sets", () => {
    stubCanvas();
    const buildable = new Set(buildableIds());
    for (const item of STARWEAVER_ITEMS) {
      expect(buildable.has(item.id), item.id).toBe(true);
      if (item.slot === "material") {
        expect(STARWEAVER_FINISHES[item.id], item.id).toBeDefined();
        continue;
      }
      const object = buildThumbnailObject(item.id);
      expect(object, item.id).not.toBeNull();
      const size = new THREE.Box3().setFromObject(object!).getSize(new THREE.Vector3());
      expect([size.x, size.y, size.z].every(value => Number.isFinite(value) && value > 0 && value < 6), item.id).toBe(true);
      object!.traverse(child => {
        if (child instanceof THREE.Mesh) expect(Array.from(child.geometry.attributes.position.array).every(Number.isFinite), item.id).toBe(true);
      });
      /* The hard ceiling for anything shown, stand and all. */
      expect(triangles(object!), item.id).toBeLessThan(20000);
      disposeObject(object!);
    }
  }, 30000);

  it("keeps each piece itself inside the book's budget: jewellery 5,000, head 8,000", () => {
    stubCanvas();
    const builders: Record<string, () => THREE.Object3D> = { ...STARWEAVER_EARRINGS, ...STARWEAVER_BROW, ...STARWEAVER_NECKLACE, ...STARWEAVER_HEAD };
    for (const item of STARWEAVER_ITEMS.filter(i => i.slot !== "material")) {
      const object = builders[item.id]();
      expect(triangles(object), item.id).toBeLessThan(item.slot === "head" ? 8000 : 5000);
      disposeObject(object);
    }
  });

  it("hangs every earring from the attachment point", () => {
    stubCanvas();
    for (const [id, build] of Object.entries(STARWEAVER_EARRINGS)) {
      const object = build();
      const top = new THREE.Box3().setFromObject(object).max.y;
      expect(top, id).toBeLessThanOrEqual(0.02);
      expect(top, id).toBeGreaterThan(-0.02);
      disposeObject(object);
    }
  });

  it("wears a single earring, on Yumi's left", () => {
    stubCanvas();
    for (const id of Object.keys(STARWEAVER_EARRINGS)) {
      const parts = rigParts();
      const rig = createOutfitRig(parts);
      const objects = rig.apply({ earrings: id });
      expect(objects, id).toHaveLength(1);
      expect(new THREE.Box3().setFromObject(objects[0]).max.x, id).toBeLessThan(-0.8);
      rig.dispose();
      expect(parts.model.children, id).toHaveLength(0);
    }
  });

  it("sets each finish, and resets it", () => {
    stubCanvas();
    const material = new THREE.MeshPhysicalMaterial();
    applyShellFinish(material, "sw-nebula-opal");
    expect(material.iridescence).toBeGreaterThan(0);
    applyShellFinish(material, "sw-eclipse-titanium");
    expect(material.metalnessMap).not.toBeNull();
    applyShellFinish(material, undefined);
    expect(material.map).toBeNull();
    expect(material.iridescence).toBe(0);
    material.dispose();
  });

  it("puts all 17 on and takes them off in quick succession, leaving nothing", () => {
    stubCanvas();
    const parts = rigParts();
    const rig = createOutfitRig(parts);
    for (const item of STARWEAVER_ITEMS) {
      rig.apply({ [item.slot]: item.id });
      rig.sync(0.016, false);
    }
    /* And worn together, one of each kind, as a reader would. */
    rig.apply({ material: "sw-nebula-opal", earrings: "sw-portal-seed", brow: "sw-zenith-pin", necklace: "sw-weavers-knot", head: "sw-cartographer-diadem" });
    rig.apply({});
    expect(parts.model.children).toHaveLength(0);
    expect(parts.lookGroup.children).toHaveLength(0);
    rig.dispose();
    expect(parts.eyeGroup.children).toHaveLength(0);
  });

  it("ships a picture for every relic", () => {
    for (const item of STARWEAVER_ITEMS) {
      expect(existsSync(join(process.cwd(), "public", "shop-thumbs", `${item.id}.webp`)), item.id).toBe(true);
    }
  });
});
