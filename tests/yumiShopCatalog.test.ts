import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toTraditional } from "@/lib/chinese/toTraditional";
import {
  SHOP_COUNTRIES,
  SHOP_ITEMS,
  SHOP_SLOTS,
  cleanOutfit,
  itemsFor,
  ownedOnly,
  shopItem,
  toggleInOutfit,
  unownedIn,
} from "@/lib/shop/catalog";
import { buildableIds } from "@/lib/yumi3d/outfit";

/* =========================================================
   The shop's catalogue, its price list and its pieces agree

   Twelve pieces per country from Chi's collection boards (2026-10-12),
   one more eye each and twelve eye basics, every one built in code, named in all five interface languages with only
   Traditional Chinese, and charged by the database at the price the shop
   shows. A piece added in one place and not the others fails here.
   ========================================================= */

describe("the catalogue", () => {
  it("has 23 pieces per country, including 10 new cultural pieces, and 12 basics", () => {
    const first = SHOP_ITEMS.filter(item => !item.id.startsWith("s33-") && !item.id.startsWith("s33v3-"));
    expect(first).toHaveLength(127);
    for (const country of SHOP_COUNTRIES.filter(c => c !== "basic")) {
      const pieces = first.filter(item => item.country === country);
      expect(pieces).toHaveLength(23);
      expect(pieces.filter(item => item.slot === "material")).toHaveLength(5);
    }
    const basics = first.filter(item => item.country === "basic");
    expect(basics).toHaveLength(12);
    // Chi asked for more eyes: every basic is one.
    expect(basics.every(item => ["pupil", "iris", "eyewear"].includes(item.slot))).toBe(true);
    expect(new Set(SHOP_ITEMS.map(item => item.id)).size).toBe(SHOP_ITEMS.length);
  });

  it("adds Station 33: three new pieces for every slot, from the five countries", () => {
    const station = SHOP_ITEMS.filter(item => item.id.startsWith("s33-"));
    expect(station).toHaveLength(36);
    expect(SHOP_ITEMS).toHaveLength(220);
    for (const slot of SHOP_SLOTS) expect(station.filter(item => item.slot === slot), slot).toHaveLength(3);
    expect(station.every(item => item.country !== "basic")).toBe(true);
  });

  /* Yumi counts on three fingers a hand (Chi, 2026-10-17). */
  it("prices everything in threes", () => {
    expect(SHOP_ITEMS.filter(item => item.price % 3 !== 0).map(item => `${item.id} ${item.price}`)).toEqual([]);
  });

  it("ships a picture of every piece, so phones do not render them", () => {
    const shipped = new Set(readdirSync(join(process.cwd(), "public/shop-thumbs")));
    expect(SHOP_ITEMS.filter(item => !shipped.has(`${item.id}.webp`)).map(item => item.id)).toEqual([]);
  });

  it("can build every piece it sells", () => {
    const buildable = new Set(buildableIds());
    expect(SHOP_ITEMS.filter(item => !buildable.has(item.id)).map(item => item.id)).toEqual([]);
  });

  it("names every piece in all five languages, and only in Traditional Chinese", () => {
    for (const item of SHOP_ITEMS) {
      for (const name of Object.values(item.names)) expect(name.trim()).not.toBe("");
      const chinese = item.names["traditional-chinese"];
      expect(toTraditional(chinese)).toBe(chinese);
    }
  });

  it("charges in the database exactly what the shop shows", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    // The shop's migrations in order, the later price of a piece replacing the earlier.
    const files = readdirSync(dir).filter(name => /_yumi_shop(_\w+)?\.sql$/.test(name)).sort();
    expect(files.length).toBeGreaterThan(0);
    const prices = new Map<string, { id: string; slot: string; price: number }>();
    for (const name of files) {
      for (const [, id, slot, price] of readFileSync(join(dir, name), "utf8").matchAll(/\('([a-z0-9-]+)', '([a-z]+)', (\d+)\)/g)) {
        prices.set(id, { id, slot, price: Number(price) });
      }
    }
    expect([...prices.values()].sort((a, b) => a.id.localeCompare(b.id)))
      .toEqual(SHOP_ITEMS.map(({ id, slot, price }) => ({ id, slot, price })).sort((a, b) => a.id.localeCompare(b.id)));

    const sql = readFileSync(join(dir, files.find(name => name.endsWith("_yumi_shop.sql"))!), "utf8");
    // One saved word, one cookie (Chi, 2026-10-12) — not the words fed to Yumi.
    const earned = sql.slice(sql.indexOf("function private.yumi_cookies_earned"), sql.indexOf("function private.yumi_wardrobe_state"));
    expect(earned).toContain("from public.vocabulary_items");
    expect(earned).not.toContain("fed_word_ids");
  });
});

describe("outfits", () => {
  it("puts a piece on with one tap and takes it off with the next", () => {
    const jade = shopItem("jade")!;
    const on = toggleInOutfit({}, jade);
    expect(on).toEqual({ material: "jade" });
    expect(toggleInOutfit(on, jade)).toEqual({});
    // A second piece for the same place replaces the first.
    expect(toggleInOutfit(on, shopItem("denim")!)).toEqual({ material: "denim" });
  });

  it("drops anything stored that is not a piece in its own place", () => {
    expect(cleanOutfit({ material: "jade", head: "jade", mouth: "nope", charm: 4, hat: "beret" }))
      .toEqual({ material: "jade" });
    expect(cleanOutfit(null)).toEqual({});
  });

  it("keeps what has not been bought out of the saved outfit", () => {
    const owned = new Set(["beret"]);
    const outfit = { head: "beret", mouth: "croissant" };
    expect(ownedOnly(outfit, owned)).toEqual({ head: "beret" });
    expect(unownedIn(outfit, owned).map(item => item.id)).toEqual(["croissant"]);
  });

  it("shows only the reader's own pieces under Mine", () => {
    expect(itemsFor("owned", "all", new Set(["beret", "jade"])).map(item => item.id)).toEqual(["jade", "beret"]);
    expect(itemsFor("owned", "tw", new Set(["beret", "jade"])).map(item => item.id)).toEqual(["jade"]);
  });
});
