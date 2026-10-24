import { SHOP_ITEMS, SHOP_SLOTS, type ShopItem, type ShopSlot, type YumiOutfit } from './catalog';
import { inShopCollection, type ShopCollection } from './collection03Presentation';

/** One home for every item, regardless of release date or country. */
export const SHOP_DEPARTMENTS = ['eyes', 'eyewear', 'earrings', 'brow', 'necklace', 'head', 'neck', 'pin', 'mouth', 'charm', 'material'] as const;
export type ShopDepartment = typeof SHOP_DEPARTMENTS[number];
export function departmentFor(slot: ShopSlot): ShopDepartment {
  return slot === 'pupil' || slot === 'iris' ? 'eyes' : slot;
}
export function browseShop(filters: {
  department: ShopDepartment | 'all'; country: ShopItem['country'] | 'all';
  collection: ShopCollection; ownedOnly: boolean; owned: ReadonlySet<string>;
}) {
  return SHOP_DEPARTMENTS.filter(key => filters.department === 'all' || key === filters.department)
    .map(key => ({ key, items: SHOP_ITEMS.filter(item =>
      departmentFor(item.slot) === key &&
      (filters.country === 'all' || item.country === filters.country) &&
      inShopCollection(item, filters.collection) &&
      (!filters.ownedOnly || filters.owned.has(item.id)),
    ).sort((a, b) => a.price - b.price || a.id.localeCompare(b.id)) }))
    .filter(group => group.items.length > 0);
}

/** An unbought trial never removes the saved item beneath it. An empty
 * slot, however, is an explicit removal and must remain empty. */
export function outfitToKeep(draft: YumiOutfit, worn: YumiOutfit, owned: ReadonlySet<string>): YumiOutfit {
  const result: YumiOutfit = {};
  for (const slot of SHOP_SLOTS) {
    const trial = draft[slot];
    const id = trial && !owned.has(trial) ? worn[slot] : trial;
    if (id && owned.has(id)) result[slot] = id;
  }
  return result;
}
