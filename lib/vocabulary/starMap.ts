import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";

/* =========================================================
   The library as a star chart (Chi, 2026-11-15: 單字星圖)

   Each word is a star, brighter the better it is known. Words the reader
   put in the same collection make one constellation, named for the
   collection; the rest gather by kind (people, objects, actions, other).
   Inside a constellation each star is joined to its nearest earlier
   neighbour, which draws the figure; words that share a root (the first
   five letters: "coordinate", "coordination") are joined across
   constellations by a fainter line.

   Pure and deterministic: the same library always draws the same sky, so
   a reader finds a word where they left it.
   ========================================================= */

export type Star = {
  id: string;
  label: string;
  status: VocabularyStatus;
  x: number;
  y: number;
  group: number;
};

export type Constellation = { key: string; name: string; emoji?: string; x: number; y: number; size: number; radius: number };
export type Line = { from: string; to: string; root: boolean };

export type StarMap = {
  stars: Star[];
  constellations: Constellation[];
  lines: Line[];
  width: number;
  height: number;
};

export type Grouping = {
  /** Collections in the order the reader made them, each with its words. */
  collections: Array<{ key: string; name: string; emoji?: string; itemIds: readonly string[] }>;
  /** Names for the kinds a word without a collection falls under. */
  categoryNames: Record<string, string>;
};

/** More than this and the chart is a fog, not a sky. */
export const MAX_STARS = 300;

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const STAR_SPACING = 26;
const GROUP_SPACING = 210;
const ROOT = 5;

const rootOf = (label: string) => {
  const folded = label.normalize("NFKD").replace(/\p{Mark}/gu, "").toLocaleLowerCase();
  return /^\p{Script=Latin}{5,}/u.test(folded) ? folded.slice(0, ROOT) : null;
};

export function buildStarMap(
  items: readonly VocabularyItem[],
  learning: LanguageCode,
  grouping: Grouping,
): StarMap {
  const chosen = [...items]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, MAX_STARS);

  const label = (item: VocabularyItem) =>
    ((item.texts as Record<string, string | undefined>)?.[learning] ?? item.word ?? "").trim() || item.word;

  /* Each word joins its first collection, or its kind. */
  const groups: Array<{ key: string; name: string; emoji?: string; items: VocabularyItem[] }> = [];
  const byKey = new Map<string, (typeof groups)[number]>();
  const placed = new Set<string>();
  const ids = new Set(chosen.map((item) => item.id));
  for (const collection of grouping.collections) {
    const members = collection.itemIds.filter((id) => ids.has(id) && !placed.has(id));
    if (members.length === 0) continue;
    const group = { key: `c:${collection.key}`, name: collection.name, emoji: collection.emoji, items: [] as VocabularyItem[] };
    groups.push(group);
    byKey.set(group.key, group);
    members.forEach((id) => placed.add(id));
  }
  for (const item of chosen) {
    let key: string;
    const inCollection = grouping.collections.find((collection) => collection.itemIds.includes(item.id) && byKey.has(`c:${collection.key}`));
    if (inCollection) key = `c:${inCollection.key}`;
    else {
      const kind = item.category in grouping.categoryNames ? item.category : "other";
      key = `k:${kind}`;
      if (!byKey.has(key)) {
        const group = { key, name: grouping.categoryNames[kind] ?? kind, items: [] as VocabularyItem[] };
        groups.push(group);
        byKey.set(key, group);
      }
    }
    byKey.get(key)!.items.push(item);
  }

  /* The biggest constellation in the middle, the rest on a spiral out. */
  groups.sort((a, b) => b.items.length - a.items.length);

  const stars: Star[] = [];
  const constellations: Constellation[] = [];
  const lines: Line[] = [];

  groups.forEach((group, index) => {
    const spread = Math.sqrt(index) * GROUP_SPACING * 0.9;
    const cx = Math.cos(index * GOLDEN * 2.1) * spread;
    const cy = Math.sin(index * GOLDEN * 2.1) * spread;
    constellations.push({
      key: group.key,
      name: group.name,
      emoji: group.emoji,
      x: cx,
      y: cy,
      size: group.items.length,
      radius: Math.sqrt(group.items.length) * STAR_SPACING,
    });

    const own: Star[] = group.items.map((item, k) => {
      const r = Math.sqrt(k + 0.5) * STAR_SPACING;
      return {
        id: item.id,
        label: label(item),
        status: item.status,
        x: cx + Math.cos(k * GOLDEN) * r,
        y: cy + Math.sin(k * GOLDEN) * r,
        group: index,
      };
    });

    /* The figure: each star to its nearest earlier neighbour. */
    own.forEach((star, k) => {
      if (k === 0) return;
      let nearest = own[0];
      let best = Infinity;
      for (let j = 0; j < k; j++) {
        const d = (own[j].x - star.x) ** 2 + (own[j].y - star.y) ** 2;
        if (d < best) {
          best = d;
          nearest = own[j];
        }
      }
      lines.push({ from: nearest.id, to: star.id, root: false });
    });

    stars.push(...own);
  });

  /* Shared roots, across the sky. */
  const byRoot = new Map<string, Star[]>();
  for (const star of stars) {
    const root = rootOf(star.label);
    if (!root) continue;
    byRoot.set(root, [...(byRoot.get(root) ?? []), star]);
  }
  for (const family of byRoot.values()) {
    for (let k = 1; k < family.length; k++) lines.push({ from: family[k - 1].id, to: family[k].id, root: true });
  }

  /* Moved so the sky starts at the origin, with a margin for labels. */
  const margin = 80;
  const xs = stars.map((star) => star.x);
  const ys = stars.map((star) => star.y);
  const minX = Math.min(0, ...xs) - margin;
  const minY = Math.min(0, ...ys) - margin;
  const maxX = Math.max(0, ...xs) + margin;
  const maxY = Math.max(0, ...ys) + margin;
  for (const star of stars) {
    star.x -= minX;
    star.y -= minY;
  }
  for (const constellation of constellations) {
    constellation.x -= minX;
    constellation.y -= minY;
  }

  return { stars, constellations, lines, width: maxX - minX, height: maxY - minY };
}
