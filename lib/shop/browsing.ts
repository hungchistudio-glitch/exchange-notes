import { SHOP_ITEMS, SHOP_SLOTS, type ShopItem, type ShopSlot, type YumiOutfit } from './catalog';
import { inShopCollection, type ShopCollection } from './collection03Presentation';
import { isCollection04Orbital, isCollection04Space } from './collection04';

/** One home for every item, regardless of release date or country. The
 * showiest departments lead (Chi, 2026-10-24: the shop opened on 28 black
 * and white pupils); the eyes, which change least on the stand, come last
 * but one, before the finishes that recolour her whole. */
export const SHOP_DEPARTMENTS = ['earrings', 'necklace', 'head', 'eyewear', 'neck', 'brow', 'pin', 'charm', 'mouth', 'eyes', 'material'] as const;
export type ShopDepartment = typeof SHOP_DEPARTMENTS[number];
export function departmentFor(slot: ShopSlot): ShopDepartment {
  return slot === 'pupil' || slot === 'iris' ? 'eyes' : slot;
}

/** The newest release: Collection 04, the 333 expansion. */
export function isNewArrival(item: ShopItem) {
  return isCollection04Orbital(item.id) || isCollection04Space(item.id);
}

/** Which of the three collections a piece belongs to, for its colour. */
export type ShopCollectionKey = 'original' | 'station33' | 'collection03';
export function collectionOf(item: ShopItem): ShopCollectionKey {
  if (inShopCollection(item, 'station33')) return 'station33';
  if (inShopCollection(item, 'collection03')) return 'collection03';
  return 'original';
}

/**
 * Where the reader is: a department (or all), a collection, the new
 * arrivals, the wardrobe. The filter sheet narrows this further
 * (filters.ts); its counts are counted within it.
 */
export function browseShop(filters: {
  department: ShopDepartment | 'all';
  collection: ShopCollection; ownedOnly: boolean; owned: ReadonlySet<string>;
  newOnly?: boolean;
}) {
  return SHOP_DEPARTMENTS.filter(key => filters.department === 'all' || key === filters.department)
    .map(key => ({ key, items: SHOP_ITEMS.filter(item =>
      departmentFor(item.slot) === key &&
      inShopCollection(item, filters.collection) &&
      (!filters.newOnly || isNewArrival(item)) &&
      (!filters.ownedOnly || filters.owned.has(item.id)),
    ).sort((a, b) => a.price - b.price || a.id.localeCompare(b.id)) }))
    .filter(group => group.items.length > 0);
}

/**
 * A shelf's window: the first `size` pieces, dealt in turn from each
 * collection (and, among the new arrivals, from each department), so a
 * shelf shows the range rather than its cheapest corner.
 */
export function shelfPicks(items: readonly ShopItem[], size: number, by: (item: ShopItem) => string = collectionOf) {
  const piles = new Map<string, ShopItem[]>();
  for (const item of items) {
    const key = by(item);
    piles.set(key, [...(piles.get(key) ?? []), item]);
  }
  const queues = [...piles.values()];
  const picks: ShopItem[] = [];
  for (let round = 0; picks.length < size && queues.some(queue => queue.length > round); round += 1) {
    for (const queue of queues) {
      if (queue[round] && picks.length < size) picks.push(queue[round]);
    }
  }
  return picks;
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
