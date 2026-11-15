/* =========================================================
   Whether the Guardian takes this deployment's key

   The key is free, but the Guardian deletes one that is ninety days old
   unless its owner answers an email, and on 2026-11-15 it did. The daily
   news then reads the Guardian's public feeds instead (lib/dailyNews.ts),
   which carry less of each story. This is how Settings tells the app's owner
   so (Chi, 2026-11-15), and nobody else: see /api/news/source-health.
   ========================================================= */

export type GuardianKeyStatus = "ok" | "missing" | "refused" | "unreachable";

/** One small request, made only when the owner opens Settings. */
export async function checkGuardianKey(): Promise<GuardianKeyStatus> {
  const apiKey = process.env.GUARDIAN_API_KEY;
  if (!apiKey) return "missing";
  const url = new URL("https://content.guardianapis.com/search");
  url.searchParams.set("page-size", "1");
  url.searchParams.set("api-key", apiKey);
  try {
    const response = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (response.status === 401 || response.status === 403) return "refused";
    return response.ok ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}
