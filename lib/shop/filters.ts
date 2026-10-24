import { SHOP_COUNTRIES, type ShopCountry, type ShopItem } from './catalog';
import { isNewArrival, shelfPicks } from './browsing';

/*
 * The shop's filters (Chi, 2026-10-24): price, ownership and what can be
 * bought now, colour, origin, and an order. Within a group, choices widen
 * the selection (any of them); across groups, they narrow it (all of them).
 * Ownership and order are one choice each.
 */

export const PRICE_BANDS = ['upTo24', 'from27To39', 'from42To54', 'from60'] as const;
export type PriceBand = typeof PRICE_BANDS[number];
const BAND_RANGES: Record<PriceBand, readonly [number, number]> = {
  upTo24: [0, 24],
  from27To39: [27, 39],
  from42To54: [42, 54],
  from60: [60, Infinity],
};
export function priceBand(price: number): PriceBand {
  return PRICE_BANDS.find(band => price >= BAND_RANGES[band][0] && price <= BAND_RANGES[band][1]) ?? 'from60';
}
/** "≤ 24", "27–39", "42–54", "60+": numbers, the same in every language. */
export function priceBandLabel(band: PriceBand) {
  const [low, high] = BAND_RANGES[band];
  return low === 0 ? `≤ ${high}` : high === Infinity ? `${low}+` : `${low}–${high}`;
}

export const OWNERSHIP = ['unowned', 'owned', 'affordable'] as const;
export type Ownership = typeof OWNERSHIP[number];

export const COLOUR_FAMILIES = ['gold', 'red', 'violet', 'green', 'blue', 'neutral'] as const;
export type ColourFamily = typeof COLOUR_FAMILIES[number];
/** What each family's chip is painted with. */
export const COLOUR_SWATCHES: Record<ColourFamily, string> = {
  gold: 'linear-gradient(135deg, #f8d26a, #e3892b 55%, #a8702a)',
  red: 'linear-gradient(135deg, #f6a3b8, #e5465b 55%, #a91f35)',
  violet: 'linear-gradient(135deg, #d6c4ff, #8d6bf5 55%, #5a33c9)',
  green: 'linear-gradient(135deg, #b7e58a, #2fb173 55%, #0f7347)',
  blue: 'linear-gradient(135deg, #8fe0f2, #3f8ee6 55%, #1f4fae)',
  neutral: 'linear-gradient(135deg, #fbf9f4, #9b978e 55%, #2a292f)',
};

/**
 * A piece's colour family, from its tone: the colour its card falls back to
 * before the picture lands, which the catalogue keeps for every piece. It
 * is the piece's main colour, not every colour in it, so a brass ring with
 * a red stone is gold.
 */
export function colourFamily(item: ShopItem): ColourFamily {
  const value = Number.parseInt(item.tone.replace('#', '').slice(0, 6), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const chroma = max - min;
  const saturation = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * lightness - 1));
  if (saturation < 0.18 || lightness < 0.12 || lightness > 0.93) return 'neutral';
  const sector = max === r ? ((g - b) / chroma + 6) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4;
  const hue = sector * 60;
  if (hue < 15 || hue >= 340) return 'red';
  if (hue < 70) return 'gold';
  if (hue < 165) return 'green';
  if (hue < 255) return 'blue';
  if (hue < 300) return 'violet';
  return 'red';
}

export const SORTS = ['recommended', 'priceLow', 'priceHigh', 'newest'] as const;
export type ShopSort = typeof SORTS[number];

export type ShopFilters = {
  price: readonly PriceBand[];
  ownership: Ownership | null;
  colour: readonly ColourFamily[];
  origin: readonly ShopCountry[];
  sort: ShopSort;
};
export type FilterGroup = Exclude<keyof ShopFilters, 'sort'>;

export const NO_FILTERS: ShopFilters = { price: [], ownership: null, colour: [], origin: [], sort: 'recommended' };

/** What the reader owns and can spend, for ownership. */
export type Wallet = { owned: ReadonlySet<string>; balance: number };

function passes(item: ShopItem, filters: ShopFilters, wallet: Wallet, skip?: FilterGroup) {
  if (skip !== 'price' && filters.price.length && !filters.price.includes(priceBand(item.price))) return false;
  if (skip !== 'colour' && filters.colour.length && !filters.colour.includes(colourFamily(item))) return false;
  if (skip !== 'origin' && filters.origin.length && !filters.origin.includes(item.country)) return false;
  if (skip !== 'ownership' && filters.ownership) {
    const owned = wallet.owned.has(item.id);
    if (filters.ownership === 'owned' && !owned) return false;
    if (filters.ownership === 'unowned' && owned) return false;
    if (filters.ownership === 'affordable' && (owned || item.price > wallet.balance)) return false;
  }
  return true;
}

export function applyFilters(items: readonly ShopItem[], filters: ShopFilters, wallet: Wallet) {
  return sortItems(items.filter(item => passes(item, filters, wallet)), filters.sort);
}

/**
 * The order within a department. Recommended deals the three collections
 * in turn over the cheapest-first list, as the shelves do.
 */
export function sortItems(items: readonly ShopItem[], sort: ShopSort) {
  const byPrice = [...items].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  if (sort === 'priceLow') return byPrice;
  if (sort === 'priceHigh') return byPrice.reverse();
  const dealt = shelfPicks(byPrice, byPrice.length);
  if (sort === 'newest') return [...dealt.filter(isNewArrival), ...dealt.filter(item => !isNewArrival(item))];
  return dealt;
}

/**
 * How many pieces each choice in a group would show, given the other
 * groups' choices: the number on its chip. Choosing it can never show
 * fewer than that, since a group's choices widen.
 */
export function facetCounts<G extends FilterGroup>(
  items: readonly ShopItem[], filters: ShopFilters, wallet: Wallet, group: G, options: readonly string[],
) {
  const open = items.filter(item => passes(item, filters, wallet, group));
  return Object.fromEntries(options.map(option => [option, open.filter(item => passes(item, choose(NO_FILTERS, group, option), wallet)).length]));
}

/** Toggles a choice: in and out of a group, or on and off for ownership. */
export function choose(filters: ShopFilters, group: FilterGroup, option: string): ShopFilters {
  if (group === 'ownership') {
    return { ...filters, ownership: filters.ownership === option ? null : option as Ownership };
  }
  const current = filters[group] as readonly string[];
  const next = current.includes(option) ? current.filter(value => value !== option) : [...current, option];
  return { ...filters, [group]: next };
}

/** How many choices are made, for the badge on the filter key. */
export function activeCount(filters: ShopFilters) {
  return filters.price.length + filters.colour.length + filters.origin.length
    + Number(filters.ownership !== null) + Number(filters.sort !== 'recommended');
}

export const ORIGINS: readonly ShopCountry[] = SHOP_COUNTRIES;
