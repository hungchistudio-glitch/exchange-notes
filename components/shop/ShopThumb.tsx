"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { ShopItem } from "@/lib/shop/catalog";
import {
  cachedThumbnail,
  requestThumbnails,
  shippedThumbnail,
  subscribeToThumbnails,
} from "@/lib/yumi3d/thumbnails";

import styles from "./YumiShop.module.css";

const noPicture = () => undefined;

/**
 * One piece's picture: the one shipped in public/shop-thumbs, loaded lazily.
 * Only if that is missing is it rendered on the device — asked for when the
 * card comes near the screen, and redrawn on its own when it lands, never the
 * whole catalogue (Chi, 2026-10-12: "動畫很卡").
 */
export default function ShopThumb({ item, className }: { item: ShopItem; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shippedMissing, setShippedMissing] = useState(false);
  /* The picture fades in once it has loaded rather than popping in. A
     picture already in the cache can finish before React is listening, so
     it is also checked once mounted. */
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) queueMicrotask(() => setLoaded(true));
  });
  const rendered = useSyncExternalStore(subscribeToThumbnails, () => cachedThumbnail(item.id), noPicture);
  const url = shippedMissing ? rendered : shippedThumbnail(item.id);

  useEffect(() => {
    const element = ref.current;
    if (!element || !shippedMissing || rendered) return;
    if (typeof IntersectionObserver === "undefined") {
      requestThumbnails([item.id]);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        requestThumbnails([item.id]);
        observer.disconnect();
      }
    }, { rootMargin: "240px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [item.id, shippedMissing, rendered]);

  return (
    <span ref={ref} className={className} aria-hidden="true">
      {url
        ? (
          // eslint-disable-next-line @next/next/no-img-element -- a small static picture, or a blob URL rendered on this device
          <img
            ref={imageRef}
            data-loaded={loaded ? "true" : "false"}
            onLoad={() => setLoaded(true)}
            src={url}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setShippedMissing(true)}
          />
        )
        : <span className={styles.swatch} style={{ background: item.tone }} />}
    </span>
  );
}
