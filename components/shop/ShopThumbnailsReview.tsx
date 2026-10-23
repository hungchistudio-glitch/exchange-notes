"use client";

import { useEffect, useState } from "react";

import { CULTURAL_ITEMS } from "@/lib/shop/culturalCollection";
import { SHOP_ITEMS } from "@/lib/shop/catalog";

/**
 * Renders every piece's picture with the same code the shop falls back on,
 * then hands them to the capture script on window.__shopThumbs and shows
 * them, so a person running it can see what is about to be written.
 */
export default function ShopThumbnailsReview() {
  const [pictures, setPictures] = useState<Record<string, string> | null>(null);

  const [progress, setProgress] = useState("Preparing…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/yumi3d/thumbnails")
      .then(({ renderThumbnailSet }) => {
        const collection = new URLSearchParams(window.location.search).get("collection");
        const items = collection === "earrings" ? CULTURAL_ITEMS.filter(item => item.slot === "earrings")
          : collection === "cultural" ? CULTURAL_ITEMS
            : collection === "station33" ? SHOP_ITEMS.filter(item => item.id.startsWith("s33-"))
              : collection === "collection03" ? SHOP_ITEMS.filter(item => item.id.startsWith("s33v3-"))
                : collection === "collection04" ? SHOP_ITEMS.filter(item => item.id.startsWith("s33v4-"))
                : SHOP_ITEMS;
        return renderThumbnailSet(items.map(item => item.id), 256, "image/webp", .9, () => cancelled, (done, total) => { if (!cancelled) setProgress(`${done} / ${total}`); });
      })
      .then(rendered => {
        if (cancelled) return;
        (window as unknown as { __shopThumbs?: Record<string, string> }).__shopThumbs = rendered;
        setPictures(rendered);
      }).catch(reason => { if (!cancelled) setError(String(reason)); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main data-shop-thumbnails={pictures ? "ready" : "rendering"} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 128px)", gap: 8, padding: 16 }}>
      {pictures
        ? Object.entries(pictures).map(([id, url]) => (
            <figure key={id} style={{ margin: 0, fontSize: 10, textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a data URL rendered on this page */}
              <img src={url} alt={id} width={128} height={128} />
              <figcaption>{id}</figcaption>
            </figure>
          ))
        : <p>{error ?? `Rendering ${progress}`}</p>}
    </main>
  );
}
