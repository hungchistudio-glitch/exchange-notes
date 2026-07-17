import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Exchange Notes",
    short_name: "Exchange Notes",
    description:
      "Learn English and Traditional Chinese together, one note at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#000000",
    icons: [
      {
        src: "/api/icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/api/icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
