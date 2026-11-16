import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client authenticated with the service role key.
 * This bypasses Row Level Security entirely, so it must NEVER be imported
 * by any code that runs in the browser or that a user request can reach
 * directly — only trusted, secret-gated server jobs (like the daily-news
 * cron route) should use it.
 *
 * Unlike lib/supabase/server.ts, this has no cookie/session handling
 * because scheduled jobs have no user session — it authenticates purely
 * via the service role key.
 */
/** Supabase's answer when its gateway stamped a token a moment ahead of the database's clock. */
const CLOCK_SKEW = /JWT issued at future/i;
/** Long enough for the clocks to agree; the jobs that use this client are not waited on by anyone. */
const CLOCK_SKEW_WAIT_MS = 1_000;
const CLOCK_SKEW_RETRIES = 2;

/**
 * fetch, asked again when Supabase refuses a request with "JWT issued at
 * future". On 2026-11-15 at 22:00 UTC the news catch-up failed on exactly
 * that: the gateway mints the token for each request, and for a moment its
 * clock ran ahead of the database's. A second later the same request is
 * accepted, so the request is sent again, at most twice; any other refusal
 * is returned as it came.
 */
export async function fetchWithClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<Response> {
  let response = await fetch(input, init);
  for (let attempt = 0; attempt < CLOCK_SKEW_RETRIES; attempt++) {
    if (response.status !== 401) return response;
    const body = await response.clone().text().catch(() => "");
    if (!CLOCK_SKEW.test(body)) return response;
    await wait(CLOCK_SKEW_WAIT_MS * (attempt + 1));
    response = await fetch(input, init);
  }
  return response;
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service role client is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: { fetch: (input, init) => fetchWithClockSkewRetry(input, init) },
  });
}
