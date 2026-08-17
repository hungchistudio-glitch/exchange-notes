-- Supabase grants EXECUTE on new public functions to anon via default
-- privileges, so `revoke ... from public` alone leaves the direct anon grant
-- in place. Revoke it explicitly: this quota function is server-side only and
-- must never be reachable from an unauthenticated session.
revoke all on function public.consume_ai_daily_quota(text, integer) from anon;
