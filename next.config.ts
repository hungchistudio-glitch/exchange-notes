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

  experimental: {
    /*
     * A tab already visited opens from the router's copy instead of asking
     * the server again (Chi, 2026-11-10: "先顯示再更新"). The default for a
     * dynamic page is zero seconds, so every tap waited a round trip, and on
     * a weak signal that was the whole lag.
     *
     * Safe for this app because what the server renders for a tab is only
     * its shell: every protected page is a client component that reads its
     * own data on the phone when it mounts — the device's copy first where
     * there is one, then the server's — so reusing the shell never shows old
     * data. (The one page that reads on the server, /messages/new, only
     * redirects.) Half an hour, as long as the opening waits before playing
     * again: a reader who has been away that long gets a fresh one anyway.
     * node_modules/next/dist/docs/01-app/03-api-reference/05-config/
     * 01-next-config-js/staleTimes.md
     */
    staleTimes: {
      dynamic: 1800,
      static: 1800,
    },
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
