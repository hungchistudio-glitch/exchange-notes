import { existsSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import english from "@/lib/i18n/en";
import spanish from "@/lib/i18n/es";
import french from "@/lib/i18n/fr";
import italian from "@/lib/i18n/it";
import traditionalChinese from "@/lib/i18n/zh-TW";
import { SHOP_ITEMS, cleanOutfit, itemsFor, shopItem } from "@/lib/shop/catalog";
import { MYTHIC_ITEMS } from "@/lib/shop/mythicCollection";
import { NIGHTSCALE_ITEMS, WINS_PER_PIECE, isNightscale, nightscaleItem } from "@/lib/shop/nightscaleCollection";
import { STARWEAVER_ITEMS } from "@/lib/shop/starweaverCollection";
import { createPreviewWallet } from "@/lib/shop/wallet";
import {
  NIGHTSCALE_BROW, NIGHTSCALE_CHARM, NIGHTSCALE_EARRINGS, NIGHTSCALE_EYEWEAR, NIGHTSCALE_FINISHES, NIGHTSCALE_HEAD,
  NIGHTSCALE_MOUTH, NIGHTSCALE_NECKLACE, NIGHTSCALE_PIN,
} from "@/lib/yumi3d/nightscaleOutfit";
import { buildThumbnailObject, buildableIds, disposeObject } from "@/lib/yumi3d/outfit";

/* =========================================================
   Nightscale｜夜鱗典藏: 24 limited pieces (Chi, 2026-11-11)

   Unlocked by every third word won in Hangyumi; never on the 333 shelves,
   apart from the vault's 33 and the relics' 17; worn like any other piece
   once owned. A tribute told in symbols only, so what must hold:
     - 24, two in every one of the twelve slots, five names and a line
       about each, the Chinese Traditional;
     - nowhere, in any language, a person's name or a registered mark:
       not on a piece, not on the shelf (Chi drew the line: symbols and
       one dedication that names nobody);
     - every one builds on the real rig inside the budget, earrings hang
       from the attachment point, and a picture ships for every one;
     - never sold, by the preview wallet as by the database.
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

const SIMPLIFIED = /[们这说时为国过还样学发经么见对东头长门问间车马鸟爱当会实现进运动电话请让认识书买卖习写读农业应该个开关钱觉听语区难题欢视务观热办体图华广场备岁变权传营节约师乐号产将处圣复无与气龙凤织遗锁鳞环链领钥]/;

/* A person's name, the marks, and the teams and brands: never, in any
   of the five languages or their scripts. */
const NEVER = /kobe|bryant|mamba|laker|nike|adidas|\bnba\b|black\s*mamba|科比|布萊恩|布莱恩|曼巴|湖人|耐吉|耐克/i;

const triangles = (object: THREE.Object3D) => {
  let count = 0;
  object.traverse(child => {
    if (child instanceof THREE.Mesh) count += (child.geometry.index?.count ?? child.geometry.attributes.position.count) / 3;
  });
  return count;
};

describe("Nightscale's catalogue", () => {
  it("holds 24 pieces, two in every slot, apart from the 333, the vault and the relics", () => {
    expect(NIGHTSCALE_ITEMS).toHaveLength(24);
    expect(new Set(NIGHTSCALE_ITEMS.map(item => item.id)).size).toBe(24);
    const slots = NIGHTSCALE_ITEMS.reduce<Record<string, number>>((count, item) => ({ ...count, [item.slot]: (count[item.slot] ?? 0) + 1 }), {});
    expect(Object.keys(slots).sort()).toEqual([
      "brow", "charm", "earrings", "eyewear", "head", "iris", "material", "mouth", "neck", "necklace", "pin", "pupil",
    ]);
    expect(Object.values(slots).every(count => count === 2)).toBe(true);
    for (const others of [SHOP_ITEMS, MYTHIC_ITEMS, STARWEAVER_ITEMS]) {
      expect(others.some(item => isNightscale(item.id))).toBe(false);
    }
    expect(NIGHTSCALE_ITEMS.map(item => item.seal)).toEqual(Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, "0")));
    for (const item of NIGHTSCALE_ITEMS) {
      expect(item.id.startsWith("ns-"), item.id).toBe(true);
      expect(Object.values(item.names).filter(name => name.trim()), item.id).toHaveLength(5);
      expect(SIMPLIFIED.test(item.names["traditional-chinese"]), item.names["traditional-chinese"]).toBe(false);
    }
    expect(WINS_PER_PIECE).toBe(3);
    expect(nightscaleItem("ns-two-banners")?.seal).toBe("24");
  });

  it("says a line about each, in all five languages, the Chinese Traditional", () => {
    for (const item of NIGHTSCALE_ITEMS) {
      const intros = Object.values(item.intro);
      expect(intros.filter(line => line.trim().length > 12), item.id).toHaveLength(5);
      expect(new Set(intros).size, item.id).toBe(5);
      expect(SIMPLIFIED.test(item.intro["traditional-chinese"]), item.intro["traditional-chinese"]).toBe(false);
      expect(item.intro.english.length, item.id).toBeLessThan(150);
    }
  });

  it("never names a person, a team or a brand, on a piece or on its shelf, in any language", () => {
    for (const item of NIGHTSCALE_ITEMS) {
      for (const line of [item.id, ...Object.values(item.names), ...Object.values(item.intro)]) {
        expect(NEVER.test(line), line).toBe(false);
      }
    }
    const dictionaries = { english, spanish, french, italian, traditionalChinese };
    for (const [language, dictionary] of Object.entries(dictionaries)) {
      const shelf = Object.values(dictionary.shop.nightscale);
      expect(shelf.filter(line => line.trim()), language).toHaveLength(8);
      for (const line of shelf) expect(NEVER.test(line), `${language}: ${line}`).toBe(false);
    }
    expect(SIMPLIFIED.test(Object.values(traditionalChinese.shop.nightscale).join(""))).toBe(false);
  });

  it("is worn like any other piece once owned, listed with what is owned, and never sold", async () => {
    expect(shopItem("ns-five-ring-circlet")?.slot).toBe("head");
    expect(cleanOutfit({ head: "ns-five-ring-circlet", earrings: "ns-fang-drop" })).toEqual({ head: "ns-five-ring-circlet", earrings: "ns-fang-drop" });
    expect(itemsFor("owned", "all", new Set(["ns-fang-drop"])).map(item => item.id)).toContain("ns-fang-drop");
    await expect(createPreviewWallet(9999).buy("ns-fang-drop")).rejects.toThrow("Unknown item.");
  });

  it("ships a picture for every piece", () => {
    for (const item of NIGHTSCALE_ITEMS) {
      expect(existsSync(join(process.cwd(), "public", "shop-thumbs", `${item.id}.webp`)), item.id).toBe(true);
    }
  });
});

describe("on the rig", () => {
  it("builds every piece with finite geometry, under the ceiling for anything shown", () => {
    stubCanvas();
    const buildable = new Set(buildableIds());
    for (const item of NIGHTSCALE_ITEMS) {
      expect(buildable.has(item.id), item.id).toBe(true);
      if (item.slot === "material") {
        expect(NIGHTSCALE_FINISHES[item.id], item.id).toBeDefined();
        continue;
      }
      const object = buildThumbnailObject(item.id);
      expect(object, item.id).not.toBeNull();
      const size = new THREE.Box3().setFromObject(object!).getSize(new THREE.Vector3());
      expect([size.x, size.y, size.z].every(value => Number.isFinite(value) && value > 0 && value < 6), item.id).toBe(true);
      object!.traverse(child => {
        if (child instanceof THREE.Mesh) expect(Array.from(child.geometry.attributes.position.array).every(Number.isFinite), item.id).toBe(true);
      });
      expect(triangles(object!), item.id).toBeLessThan(20000);
      disposeObject(object!);
    }
  }, 30000);

  /* The house necklace chain alone is about 7,700 (outfitKit.chain). */
  it("keeps the small pieces light: everything but the shells under 12,000 triangles", () => {
    stubCanvas();
    const builders: Record<string, () => THREE.Object3D> = {
      ...NIGHTSCALE_EARRINGS, ...NIGHTSCALE_BROW, ...NIGHTSCALE_NECKLACE, ...NIGHTSCALE_PIN, ...NIGHTSCALE_CHARM,
      ...NIGHTSCALE_MOUTH, ...NIGHTSCALE_EYEWEAR, ...NIGHTSCALE_HEAD,
    };
    for (const [id, build] of Object.entries(builders)) {
      const object = build();
      expect(triangles(object), id).toBeLessThan(12000);
      disposeObject(object);
    }
  });

  it("hangs every earring, charm and mouth piece from the attachment point", () => {
    stubCanvas();
    for (const [id, build] of Object.entries({ ...NIGHTSCALE_EARRINGS, ...NIGHTSCALE_CHARM, ...NIGHTSCALE_MOUTH })) {
      const object = build();
      const top = new THREE.Box3().setFromObject(object).max.y;
      expect(top, id).toBeLessThanOrEqual(0.02);
      expect(top, id).toBeGreaterThan(-0.02);
      disposeObject(object);
    }
  });
});
