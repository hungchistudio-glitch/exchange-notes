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
  });
}
