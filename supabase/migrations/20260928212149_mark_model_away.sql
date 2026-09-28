-- Writing a model's mark only ever lengthens it (2026-09-28).
--
-- lib/ai/modelHealth.ts used a plain upsert, so the last writer won: a model
-- out for the day until midnight Pacific, asked by an instance that had not
-- read the table in time, answered 503 — and "busy for 45 seconds" replaced
-- "out until tomorrow". Forty-five seconds later every feature asked it again.
create or replace function public.mark_model_away(
  p_model text,
  p_until timestamptz,
  p_reason text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_model_health (model, unavailable_until, reason, updated_at)
  values (p_model, p_until, p_reason, now())
  on conflict (model) do update
    set unavailable_until = excluded.unavailable_until,
        reason = excluded.reason,
        updated_at = now()
    where public.ai_model_health.unavailable_until < excluded.unavailable_until;
$$;

revoke all on function public.mark_model_away(text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.mark_model_away(text, timestamptz, text) to service_role;
