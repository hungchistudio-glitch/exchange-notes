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
    icons: [
      {
        src: "/api/icon?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/icon-maskable?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
