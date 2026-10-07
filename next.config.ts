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
    // Only verified publisher image hosts; RSS adapters also validate URLs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.guim.co.uk",
        port: "",
        pathname: "/**",
      },
      { protocol: "https", hostname: "storage.ghost.io", port: "", pathname: "/c/51/f8/51f871d8-b6be-4a73-b958-0ca4fff0110a/content/images/**" },
      { protocol: "https", hostname: "www.artnews.com", port: "", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "cdn.arstechnica.net", port: "", pathname: "/wp-content/uploads/**" },
      { protocol: "https", hostname: "assets.vogue.com", port: "", pathname: "/photos/**" },
      { protocol: "https", hostname: "r.fashionunited.com", port: "", pathname: "/**" },
    ],
  },
};

export default nextConfig;
