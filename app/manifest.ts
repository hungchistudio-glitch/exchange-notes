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
    // Matches viewport.themeColor in app/layout.tsx — these two used to
    // disagree (manifest said black, viewport said the warm surface tone),
    // which showed up as an inconsistent status-bar/splash color depending
    // on which one a given platform reads.
    background_color: "#f5f3ed",
    theme_color: "#f5f3ed",
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
