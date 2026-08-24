import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Exchange Notes",
    short_name: "Exchange Notes",
    description:
      "Look up any word in five languages, and keep the ones worth remembering.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    /*
     * These two describe what the OS paints *before* the document exists, so
     * they have to match the app's first frame rather than its resting state.
     *
     * That first frame is always the opening animation: SplashGate renders it
     * on every load of a signed-in page, in both interface modes, and it is
     * server-rendered — `.launch` is fixed, inset-0 and dark from the initial
     * paint, so nothing of the page shows behind it. Its backdrop is a radial
     * gradient from #171a1f at the centre out to #07080b, and #07080b is the
     * tone that reaches the edges, which is what a flat splash fill sits next
     * to.
     *
     * They used to be #f5f3ed, the Standard Mode surface. On an installed PWA
     * that produced a cream flash on every launch — the OS splash painting the
     * resting colour of one mode, immediately replaced by a near-black opening.
     *
     * This is deliberately not viewport.themeColor, which these once tracked.
     * That is now per-mode (see generateViewport in app/layout.tsx) and takes
     * over as soon as the document loads; a static manifest cannot follow it,
     * and the pre-document moment belongs to the opening either way.
     */
    background_color: "#07080b",
    theme_color: "#07080b",
    /*
     * Static files rather than the two ImageResponse routes these used to
     * point at (/api/icon and /api/icon-maskable, now deleted).
     *
     * The artwork stopped being something worth rendering per request the
     * moment it became a generated asset — scripts/generate-brand.mjs
     * writes these from lib/brand/exchangeNotesLogo.ts alongside every other surface
     * the mark appears on, so serving them from /public is both cheaper and
     * the only way they are guaranteed to match app/icon.svg and the brand
     * tree. It also puts them back inside the service worker's reach:
     * public/sw.js deliberately skips /api/*, so the old icons could never be
     * cached, and an installed app that lost its network lost its own icon
     * from any surface that re-fetched it.
     *
     * The app icon is rendered artwork now — a charcoal slate slab with the
     * mark carved into it — resampled from one master so every size shows the
     * same symbol. It is opaque to every edge with no corner mask of its own,
     * because every platform applies its own.
     *
     * "any" and "maskable" are two framings of that master rather than one
     * file used twice: the Home Screen wants the symbol large enough to hold
     * its own beside the apps around it, and Android's circular crop wants it
     * pulled back inside the inner 80%. See scripts/generate-brand.mjs.
     */
    icons: [
      {
        src: "/brand/app-icon/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/app-icon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      /*
       * The maskable entry is its own artwork now, not the same file under a
       * second purpose. Android guarantees only the inner 80% circle, and the
       * Home Screen framing puts the carved symbol 41.6% of the way out from
       * the centre — a launcher that crops to a circle would clip the arc.
       * The maskable framing pulls back to 38.3%, inside the guarantee.
       */
      {
        src: "/brand/app-icon/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/app-icon/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
