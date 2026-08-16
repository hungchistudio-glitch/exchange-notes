import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/classify-text": ["./data/cc-cedict-vocabulary-index.json.gz"],
  },

  images: {
    // Discover's story images are Guardian thumbnails and nothing else — they
    // come from one field, `fields.thumbnail` in lib/dailyNews.ts, which the
    // Guardian API serves exclusively from this host. Pinning the pattern to
    // that host and path keeps the image optimizer from being usable as an
    // open proxy for arbitrary remote URLs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.guim.co.uk",
        port: "",
        pathname: "/**",
      },
    ],
  },

  experimental: {
    // Powers Yumi Cosmic Mode's deck-to-room travel. Off by default, so this
    // flag is what makes React's <ViewTransition> and Link's transitionTypes
    // available at all — see app/cosmic-motion.css for what they drive.
    //
    // Standard Mode is unaffected: it never tags a navigation with a
    // transition type, and every animation below is keyed to a type.
    viewTransition: true,
  },
};

export default nextConfig;
