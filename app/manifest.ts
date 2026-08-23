import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Exchange Notes",
    short_name: "Exchange Notes",
    description:
      "Learn English and Traditional Chinese together, one note at a time.",
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
     * moment it became a generated asset — scripts/generate-yumi-brand.mjs
     * writes these from lib/brand/yumiMark.ts alongside every other surface
     * the mark appears on, so serving them from /public is both cheaper and
     * the only way they are guaranteed to match app/icon.svg and the brand
     * tree. It also puts them back inside the service worker's reach:
     * public/sw.js deliberately skips /api/*, so the old icons could never be
     * cached, and an installed app that lost its network lost its own icon
     * from any surface that re-fetched it.
     *
     * One file serves both purposes. A maskable icon must be opaque to every
     * edge and keep its artwork inside the OS's crop; this square is opaque
     * with no corner mask of its own, and the mark sits well inside the safe
     * circle at 48% of the canvas, so there is nothing for a separate
     * maskable drawing to change.
     */
    icons: [
      {
        src: "/yumi-brand/app-icon/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/yumi-brand/app-icon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/yumi-brand/app-icon/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
