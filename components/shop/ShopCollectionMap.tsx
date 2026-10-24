"use client";

import { Compass, Orbit, Sparkles, Globe2 } from "lucide-react";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { fill } from "@/lib/i18n/format";
import { SHOP_ITEMS } from "@/lib/shop/catalog";
import { inShopCollection, type ShopCollection } from "@/lib/shop/collection03Presentation";
import styles from "./YumiShop.module.css";

const DESTINATIONS = [
  { id: "original", Icon: Globe2, bearing: "01" },
  { id: "station33", Icon: Orbit, bearing: "02" },
  { id: "collection03", Icon: Sparkles, bearing: "03" },
] as const;
const COUNTS = Object.fromEntries(DESTINATIONS.map(({ id }) => [id, SHOP_ITEMS.filter(item => inShopCollection(item, id)).length]));

/** A small working star chart: every destination filters the real catalogue.
 * No extra canvas, animation loop, fetch or copy of the wardrobe. */
export default function ShopCollectionMap({ collection, onChoose, copy, labels, locale }: {
  collection: ShopCollection;
  onChoose: (collection: ShopCollection) => void;
  copy: TranslationDictionary["shop"]["boutique"];
  labels: Record<ShopCollection, string>;
  locale: string;
}) {
  const destination = DESTINATIONS.find(({ id }) => id === collection);
  return (
    <section className={styles.collectionCabinet} aria-label={copy.map}>
      <div className={styles.cabinetIntro}>
        <span className={styles.cabinetCompass} aria-hidden="true"><Compass size={23} strokeWidth={1} /></span>
        <div><h2>{copy.title}</h2><p>{copy.intro}</p></div>
      </div>
      <div className={styles.collectionRoutes} role="group" aria-label={copy.map}>
        {DESTINATIONS.map(({ id, Icon, bearing }) => (
          <button type="button" key={id} className={styles.collectionRoute} aria-pressed={collection === id} aria-controls="shop-collection-story" onClick={() => onChoose(collection === id ? "all" : id)}>
            <span className={styles.routePlanet} aria-hidden="true"><Icon size={25} strokeWidth={1.2} /></span>
            <span className={styles.routeBearing} aria-hidden="true">{bearing}</span>
            <span className={styles.routeName}>{labels[id]}</span>
            <span className={styles.routeCount}>{fill(copy.pieces, { count: COUNTS[id].toLocaleString(locale) })}</span>
          </button>
        ))}
      </div>
      <div className={styles.collectionStory} id="shop-collection-story" aria-live="polite" aria-atomic="true">
        <p key={collection}>{destination ? copy.stories[destination.id] : copy.overview}</p>
        {collection !== "all" && <button type="button" onClick={() => onChoose("all")}>{copy.all}<span aria-hidden="true"> ↗</span></button>}
      </div>
    </section>
  );
}
