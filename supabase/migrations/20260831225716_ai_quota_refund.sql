-- Give a daily AI request back when the model never answered.
--
-- The quota is spent before the model is called, which is the only ordering
-- that is safe against two shutter presses racing each other. The cost of
-- that ordering is that a request the model timed out on, or refused, is
-- charged to the reader exactly like one that produced a word. Fifteen a day
-- is not many to begin with; spending them on failures is what made the
-- allowance feel far smaller than the number suggests.
--
-- So the routes now hand the unit back when the call fails. Same shape as
-- consume_ai_daily_quota: security definer, the user id taken from auth.uid()
-- and never from the caller, and the operation name checked against the same
-- pattern the table's own constraint uses.

create or replace function public.refund_ai_daily_quota(
  p_operation text
)
returns table (
  used integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (timezone('utc', now()))::date;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_operation is null or p_operation !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'Invalid AI operation' using errcode = '22023';
  end if;

  -- greatest() rather than a plain subtraction: the table checks that the
  -- count is not negative, so a refund arriving without a matching charge
  -- must be a no-op and not an error the route has to handle.
  update public.ai_usage_daily
     set request_count = greatest(0, request_count - 1),
         updated_at = now()
   where user_id = v_user_id
     and usage_date = v_today
     and operation = p_operation
  returning request_count into v_used;

  return query select coalesce(v_used, 0);
end;
$$;

-- Supabase's default privileges grant EXECUTE on new public-schema functions
-- directly to anon, and a direct grant survives a revoke aimed at the PUBLIC
-- pseudo-role. Revoke anon explicitly, exactly as the consume function does.
revoke all on function public.refund_ai_daily_quota(text) from public;
revoke all on function public.refund_ai_daily_quota(text) from anon;
grant execute on function public.refund_ai_daily_quota(text) to authenticated;

comment on function public.refund_ai_daily_quota(text) is
  'Returns one daily AI request to the calling user after a failed model call.';
