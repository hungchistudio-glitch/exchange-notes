export const APP_ORIGIN = "https://exchange-notes-app.vercel.app";

// Explicit production aliases only: preview deployments and localhost stay usable.
// Vercel names two of them after the team's URL, which became hung-chi-studio on
// 2026-11-16 (Chi renamed the team Hung Chi Studio); the old names are kept for as
// long as earlier deployments answer to them.
const LEGACY_HOSTS = new Set([
  "v0-language-exchange-app-bychi.vercel.app",
  "exchange-notes-app-hung-chi-studio.vercel.app",
  "exchange-notes-app-git-main-hung-chi-studio.vercel.app",
  "exchange-notes-app-hungchistudio-7883s-projects.vercel.app",
  "exchange-notes-app-git-main-hungchistudio-7883s-projects.vercel.app",
]);

export function canonicalPageUrl(url: URL, method: string): URL | null {
  if (!LEGACY_HOSTS.has(url.hostname) || !["GET", "HEAD"].includes(method)) {
    return null;
  }

  // OAuth's PKCE verifier and active sessions belong to the initiating host.
  // Do not forward callbacks, mutations, or build/PWA assets across origins.
  if (
    /^\/(?:api|auth|_next|mediapipe)(?:\/|$)/.test(url.pathname) ||
    /\.[^/]+$/.test(url.pathname)
  ) {
    return null;
  }

  const target = new URL(APP_ORIGIN);
  target.pathname = url.pathname;
  target.search = url.search;
  return target;
}
