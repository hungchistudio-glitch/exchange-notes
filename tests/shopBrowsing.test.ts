import { describe, expect, it } from 'vitest';
import { SHOP_ITEMS } from '@/lib/shop/catalog';
import { browseShop, departmentFor, outfitToKeep } from '@/lib/shop/browsing';

const filters = { department: 'all', country: 'all', collection: 'all', ownedOnly: false, owned: new Set<string>() } as const;
describe('a unified shop catalogue', () => {
  it('places every old and new item exactly once in its body department', () => {
    const groups = browseShop(filters);
    const ids = groups.flatMap(group => group.items.map(item => item.id));
    expect(ids).toHaveLength(SHOP_ITEMS.length);
    expect(new Set(ids).size).toBe(SHOP_ITEMS.length);
    for (const group of groups) {
      expect(group.items.every(item => departmentFor(item.slot) === group.key)).toBe(true);
      expect(group.items.some(item => item.id.startsWith('s33v3-'))).toBe(true);
      expect(group.items.some(item => !item.id.startsWith('s33v3-'))).toBe(true);
    }
  });
  it('combines country, collection, department and ownership rather than resetting other filters', () => {
    const groups = browseShop({ ...filters, country: 'tw', collection: 'collection03', department: 'earrings', ownedOnly: true, owned: new Set(['s33v3-window-lattice','s33v3-castanet']) });
    expect(groups.flatMap(group => group.items.map(item => item.id))).toEqual(['s33v3-window-lattice']);
    expect(browseShop({ ...filters, country: 'fr', collection: 'collection03', department: 'material' })).toEqual([]);
  });
  it('preserves saved slots covered by an unowned trial, but honors deliberate removals', () => {
    const owned = new Set(['jade','monocle']);
    expect(outfitToKeep({ material:'porcelain', eyewear:'monocle' }, { material:'jade' }, owned)).toEqual({ material:'jade', eyewear:'monocle' });
    expect(outfitToKeep({ material:'porcelain' }, {}, owned)).toEqual({});
    expect(outfitToKeep({}, { material:'jade' }, owned)).toEqual({});
  });
});
