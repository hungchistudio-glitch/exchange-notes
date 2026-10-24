"use client";

import { Globe2, Orbit, Sparkles } from "lucide-react";

import { fill } from "@/lib/i18n/format";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { ShopCollectionKey } from "@/lib/shop/browsing";
import { SHOP_ITEMS } from "@/lib/shop/catalog";
import { inShopCollection, type ShopCollection } from "@/lib/shop/collection03Presentation";

import styles from "./YumiShop.module.css";

export const SHOP_COLLECTION_TILES = [
  { id: "original", Icon: Globe2 },
  { id: "station33", Icon: Orbit },
  { id: "collection03", Icon: Sparkles },
] as const satisfies readonly { id: ShopCollectionKey; Icon: unknown }[];

const COUNTS = Object.fromEntries(
  SHOP_COLLECTION_TILES.map(({ id }) => [id, SHOP_ITEMS.filter(item => inShopCollection(item, id)).length]),
) as Record<ShopCollectionKey, number>;

/**
 * The three collections, always in view (Chi, 2026-10-24: they had been
 * behind the coin). Each tile wears its collection's colour, the same one
 * its pieces carry on their cards; the chosen tile fills with it, and
 * choosing it again returns to all three.
 */
export default function ShopCollectionSwitch({ collection, onChoose, copy, labels, locale }: {
  collection: ShopCollection;
  onChoose: (collection: ShopCollection) => void;
  copy: TranslationDictionary["shop"]["boutique"];
  labels: Record<ShopCollection, string>;
  locale: string;
}) {
  const chosen = SHOP_COLLECTION_TILES.find(({ id }) => id === collection);
  return (
    <section className={styles.collections} aria-label={copy.map}>
      <div className={styles.collectionTiles} role="group" aria-label={copy.map}>
        {SHOP_COLLECTION_TILES.map(({ id, Icon }) => (
          <button
            key={id}
            type="button"
            className={styles.collectionTile}
            data-collection={id}
            aria-pressed={collection === id}
            aria-controls="shop-collection-story"
            onClick={() => onChoose(collection === id ? "all" : id)}
          >
            <span className={styles.collectionMark} aria-hidden="true"><Icon size={18} strokeWidth={1.6} /></span>
            <span className={styles.collectionName}>{labels[id]}</span>
            <span className={styles.collectionCount}>{fill(copy.pieces, { count: COUNTS[id].toLocaleString(locale) })}</span>
          </button>
        ))}
      </div>
      <div className={styles.collectionStory} id="shop-collection-story" aria-live="polite" aria-atomic="true" data-collection={chosen?.id}>
        {chosen && (
          <>
            <p key={chosen.id}>{copy.stories[chosen.id]}</p>
            <button type="button" onClick={() => onChoose("all")}>{copy.all}</button>
          </>
        )}
      </div>
    </section>
  );
}
