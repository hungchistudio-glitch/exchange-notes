import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toTraditional } from "@/lib/chinese/toTraditional";
import {
  SHOP_COUNTRIES,
  SHOP_ITEMS,
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

   Sixty pieces, twelve per country (Chi's collection boards, 2026-10-12),
   every one built in code, named in all five interface languages with only
   Traditional Chinese, and charged by the database at the price the shop
   shows. A piece added in one place and not the others fails here.
   ========================================================= */

describe("the catalogue", () => {
  it("has twelve pieces per country, three of them shell materials", () => {
    expect(SHOP_ITEMS).toHaveLength(60);
    for (const country of SHOP_COUNTRIES) {
      const pieces = SHOP_ITEMS.filter(item => item.country === country);
      expect(pieces).toHaveLength(12);
      expect(pieces.filter(item => item.slot === "material")).toHaveLength(3);
    }
    expect(new Set(SHOP_ITEMS.map(item => item.id)).size).toBe(60);
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
    const file = readdirSync(dir).find(name => name.endsWith("_yumi_shop.sql"));
    expect(file).toBeDefined();
    const sql = readFileSync(join(dir, file!), "utf8");
    const rows = [...sql.matchAll(/\('([a-z-]+)', '([a-z]+)', (\d+)\)/g)]
      .map(([, id, slot, price]) => ({ id, slot, price: Number(price) }));
    expect(rows).toEqual(SHOP_ITEMS.map(({ id, slot, price }) => ({ id, slot, price })));
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
