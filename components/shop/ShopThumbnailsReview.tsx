"use client";

import { useEffect, useState } from "react";

import { SHOP_ITEMS } from "@/lib/shop/catalog";

/**
 * Renders every piece's picture with the same code the shop falls back on,
 * then hands them to the capture script on window.__shopThumbs and shows
 * them, so a person running it can see what is about to be written.
 */
export default function ShopThumbnailsReview() {
  const [pictures, setPictures] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/yumi3d/thumbnails")
      .then(({ renderThumbnailSet }) => renderThumbnailSet(SHOP_ITEMS.map(item => item.id)))
      .then(rendered => {
        if (cancelled) return;
        (window as unknown as { __shopThumbs?: Record<string, string> }).__shopThumbs = rendered;
        setPictures(rendered);
      });
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
        : <p>Rendering…</p>}
    </main>
  );
}
