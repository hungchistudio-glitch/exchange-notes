-- The daily AI allowance rolls over on the reader's midnight, not on UTC's.
--
-- Both quota functions keyed the day on (timezone('utc', now()))::date. Every
-- other "day" in the app is a local one — the streak, "added today", the daily
-- goal — so a reader in Taipei had a streak that turned over at midnight and
-- an AI allowance that came back at eight the next morning, halfway through
-- the day they were already using it in.
--
-- The zone is the one notification_preferences already holds for Yumi's
-- reminders, which is where "what time is it for this reader" was already
-- being answered. It is written from the device (DeviceTimeZoneSync), and
-- validated as a real IANA zone before it is stored, so timezone() below
-- cannot be handed something that raises.
--
-- Falling back to UTC rather than to the column's 'America/New_York' default:
-- a reader whose zone has not reached the server yet keeps exactly the
-- behaviour they have today, which is the only fallback that changes nothing
-- for anyone.
--
-- On the day this deploys, a reader whose local date differs from the UTC date
-- moves to a different key in ai_usage_daily and may find their allowance
-- reset. That is a one-off, in the reader's favour, and self-correcting.

create or replace function public.ai_quota_local_day(p_user_id uuid)
returns date
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_zone text;
begin
  select nullif(btrim(np.time_zone), '')
    into v_zone
    from public.notification_preferences np
   where np.user_id = p_user_id;

  if v_zone is null then
    return (timezone('UTC', now()))::date;
  end if;

  /*
   * The zone is validated as a real IANA name before it is stored, so this
   * should not fire. It is here because the alternative is worse than a wrong
   * day: timezone() raises on a name Postgres does not know, that would
   * propagate out of consume_ai_daily_quota, and the route treats an RPC
   * error as "the persistent quota is unavailable" — latched, process-wide,
   * for every reader that instance goes on to serve. One bad row must not
   * move everyone onto the in-memory safety net.
   */
  begin
    return (timezone(v_zone, now()))::date;
  exception when others then
    return (timezone('UTC', now()))::date;
  end;
end;
$$;

revoke all on function public.ai_quota_local_day(uuid) from public;
revoke all on function public.ai_quota_local_day(uuid) from anon;
revoke all on function public.ai_quota_local_day(uuid) from authenticated;

comment on function public.ai_quota_local_day(uuid) is
  'The calendar date it currently is for one user, in the zone their device reported. Internal to the AI quota functions.';

-- Unchanged but for v_today. Repeated in full because the body is replaced
-- wholesale, and a create-or-replace that drifts from the original is how the
-- next reader ends up comparing two versions to find out what actually runs.
create or replace function public.consume_ai_daily_quota(
  p_operation text,
  p_limit integer
)
returns table (
  allowed boolean,
  used integer,
  limit_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date;
  v_used integer;
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 1000));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_operation is null or p_operation !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'Invalid AI operation' using errcode = '22023';
  end if;

  v_today := public.ai_quota_local_day(v_user_id);

  insert into public.ai_usage_daily (
    user_id,
    usage_date,
    operation,
    request_count
  ) values (
    v_user_id,
    v_today,
    p_operation,
    1
  )
  on conflict (user_id, usage_date, operation)
  do update set
    request_count = public.ai_usage_daily.request_count + 1,
    updated_at = now()
  where public.ai_usage_daily.request_count < v_limit
  returning request_count into v_used;

  if v_used is null then
    select request_count
      into v_used
      from public.ai_usage_daily
      where user_id = v_user_id
        and usage_date = v_today
        and operation = p_operation;

    return query select false, coalesce(v_used, v_limit), v_limit;
    return;
  end if;

  return query select true, v_used, v_limit;
end;
$$;

revoke all on function public.consume_ai_daily_quota(text, integer) from public;
revoke all on function public.consume_ai_daily_quota(text, integer) from anon;
grant execute on function public.consume_ai_daily_quota(text, integer) to authenticated;

-- The refund has to land on the same key the charge did, so it reads the day
-- the same way. Charge and refund are milliseconds apart, so the only way they
-- disagree is a reader crossing their own midnight between the two — which was
-- equally true of the UTC boundary this replaces.
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
  v_today date;
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_operation is null or p_operation !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'Invalid AI operation' using errcode = '22023';
  end if;

  v_today := public.ai_quota_local_day(v_user_id);

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

revoke all on function public.refund_ai_daily_quota(text) from public;
revoke all on function public.refund_ai_daily_quota(text) from anon;
grant execute on function public.refund_ai_daily_quota(text) to authenticated;
