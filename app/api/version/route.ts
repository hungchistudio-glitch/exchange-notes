/*
 * Which build this server is running, for an app coming back from the
 * background to compare with the build it has on screen (see
 * lib/pwa/appUpdate.ts and components/foundation/AppUpdateWatcher.tsx).
 *
 * NEXT_PUBLIC_APP_VERSION is written into every bundle at build time
 * (next.config.ts), so this answer and the client's own copy come from the
 * same place: they differ exactly when the client is from an older build.
 * Nothing about the account is read, so it needs no session.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
