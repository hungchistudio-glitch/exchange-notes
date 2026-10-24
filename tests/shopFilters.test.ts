import { describe, expect, it } from 'vitest';

import { SHOP_ITEMS } from '@/lib/shop/catalog';
import { collectionOf, isNewArrival } from '@/lib/shop/browsing';
import {
  COLOUR_FAMILIES,
  NO_FILTERS,
  PRICE_BANDS,
  activeCount,
  applyFilters,
  choose,
  colourFamily,
  facetCounts,
  priceBand,
  priceBandLabel,
  sortItems,
} from '@/lib/shop/filters';

/* =========================================================
   The shop's filters (Chi, 2026-10-24): price, ownership, colour, origin
   and an order. Choices in one group widen; groups narrow each other.
   ========================================================= */

const nobody = { owned: new Set<string>(), balance: 0 };

describe('the definitions', () => {
  it('puts every price in exactly one band, labelled with its numbers', () => {
    for (const item of SHOP_ITEMS) expect(PRICE_BANDS).toContain(priceBand(item.price));
    expect(PRICE_BANDS.map(priceBandLabel)).toEqual(['≤ 24', '27–39', '42–54', '60+']);
    expect(priceBand(24)).toBe('upTo24');
    expect(priceBand(27)).toBe('from27To39');
    expect(priceBand(66)).toBe('from60');
  });

  it('reads a colour family from each tone, and every family has pieces', () => {
    expect(colourFamily({ ...SHOP_ITEMS[0], tone: '#e3892b' })).toBe('gold');
    expect(colourFamily({ ...SHOP_ITEMS[0], tone: '#2a6fd6' })).toBe('blue');
    expect(colourFamily({ ...SHOP_ITEMS[0], tone: '#25262c' })).toBe('neutral');
    expect(colourFamily({ ...SHOP_ITEMS[0], tone: '#f29bb0' })).toBe('red');
    const counts = facetCounts(SHOP_ITEMS, NO_FILTERS, nobody, 'colour', COLOUR_FAMILIES);
    for (const family of COLOUR_FAMILIES) expect(counts[family], family).toBeGreaterThan(0);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(SHOP_ITEMS.length);
  });
});

describe('filtering', () => {
  it('widens within a group and narrows across groups', () => {
    const cheap = choose(NO_FILTERS, 'price', 'upTo24');
    const cheapOrMid = choose(cheap, 'price', 'from27To39');
    const few = applyFilters(SHOP_ITEMS, cheap, nobody).length;
    const more = applyFilters(SHOP_ITEMS, cheapOrMid, nobody).length;
    expect(more).toBeGreaterThan(few);
    const taiwanese = applyFilters(SHOP_ITEMS, choose(cheapOrMid, 'origin', 'tw'), nobody);
    expect(taiwanese.length).toBeLessThan(more);
    expect(taiwanese.every(item => item.country === 'tw' && item.price <= 39)).toBe(true);
    // A second tap takes the choice out again.
    expect(choose(cheap, 'price', 'upTo24')).toEqual(NO_FILTERS);
  });

  it('knows what is owned, and what the balance can buy now', () => {
    const wallet = { owned: new Set(['monocle']), balance: 24 };
    const owned = applyFilters(SHOP_ITEMS, choose(NO_FILTERS, 'ownership', 'owned'), wallet);
    expect(owned.map(item => item.id)).toEqual(['monocle']);
    const affordable = applyFilters(SHOP_ITEMS, choose(NO_FILTERS, 'ownership', 'affordable'), wallet);
    expect(affordable.length).toBeGreaterThan(0);
    expect(affordable.every(item => item.price <= 24 && item.id !== 'monocle')).toBe(true);
    // One choice: picking another replaces it, picking it again clears it.
    const unowned = choose(choose(NO_FILTERS, 'ownership', 'owned'), 'ownership', 'unowned');
    expect(unowned.ownership).toBe('unowned');
    expect(choose(unowned, 'ownership', 'unowned').ownership).toBeNull();
  });

  it('counts each chip as what choosing it would show, given the other groups', () => {
    const filters = choose(NO_FILTERS, 'origin', 'fr');
    const counts = facetCounts(SHOP_ITEMS, filters, nobody, 'price', PRICE_BANDS);
    for (const band of PRICE_BANDS) {
      expect(counts[band]).toBe(applyFilters(SHOP_ITEMS, choose(filters, 'price', band), nobody).length);
    }
    // A group's own choices do not shrink its own counts.
    const origins = facetCounts(SHOP_ITEMS, filters, nobody, 'origin', ['fr', 'it']);
    expect(origins.it).toBe(SHOP_ITEMS.filter(item => item.country === 'it').length);
  });

  it('counts what is chosen for the key, the order included once it is not the default', () => {
    expect(activeCount(NO_FILTERS)).toBe(0);
    const some = { ...choose(choose(NO_FILTERS, 'colour', 'gold'), 'ownership', 'unowned'), sort: 'priceHigh' as const };
    expect(activeCount(some)).toBe(3);
  });
});

describe('ordering', () => {
  const earrings = SHOP_ITEMS.filter(item => item.slot === 'earrings');

  it('orders by price either way, keeping every piece', () => {
    const low = sortItems(earrings, 'priceLow').map(item => item.price);
    expect(low).toEqual([...low].sort((a, b) => a - b));
    const high = sortItems(earrings, 'priceHigh').map(item => item.price);
    expect(high).toEqual([...high].sort((a, b) => b - a));
    expect(sortItems(earrings, 'recommended')).toHaveLength(earrings.length);
  });

  it('puts the new arrivals first when asked, and deals the collections by default', () => {
    const newest = sortItems(earrings, 'newest');
    const firstOld = newest.findIndex(item => !isNewArrival(item));
    expect(newest.slice(firstOld).some(isNewArrival)).toBe(false);
    const firstThree = sortItems(earrings, 'recommended').slice(0, 3);
    expect(new Set(firstThree.map(collectionOf)).size).toBe(3);
  });
});
