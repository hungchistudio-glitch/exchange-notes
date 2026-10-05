import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Both loopback spellings are used by the local phone-size previews.
  allowedDevOrigins: ["127.0.0.1"],
  /*
   * Which build this is, in both bundles: the app compares its own copy with
   * what /api/version answers when it comes back from the background, and
   * reloads onto the newer one (lib/pwa/appUpdate.ts). Empty off Vercel,
   * which turns that check off.
   */
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  },

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
};

export default nextConfig;
