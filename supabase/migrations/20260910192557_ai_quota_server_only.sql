-- =========================================================
-- The AI allowance stops being something a reader can refund
--
-- consume_ai_daily_quota and refund_ai_daily_quota were SECURITY DEFINER
-- and executable by `authenticated`, which means every signed-in reader
-- could reach them directly at /rest/v1/rpc/. Consume was harmless that
-- way — spending your own allowance faster is not an attack. Refund was
-- not:
--
--     update public.ai_usage_daily
--        set request_count = greatest(0, request_count - 1)
--      where user_id = auth.uid() ...
--
-- Called in a loop it drives the caller's own counter to zero, so the
-- daily limit on every one of the eight operations was advisory. The bill
-- it protects is real and is paid by this project.
--
-- Both functions took the reader from auth.uid(), which is precisely what
-- made them client-callable and nothing else. They now take the user id as
-- an argument and are executable by `service_role` alone — the routes hold
-- that key, a browser never does.
--
-- This half is additive on purpose. Removing the old signatures in the
-- same transaction would break whatever is deployed at the moment it runs,
-- because the running code still calls them. So this file only adds the
-- locked-down forms; 20260910193025 removes the reachable ones, and is
-- meant to be applied after the deploy that switches the callers over.
-- =========================================================

-- ---------- the server-only forms ----------

create or replace function public.consume_ai_daily_quota(
  p_user_id uuid,
  p_operation text,
  p_limit integer
)
returns table(allowed boolean, used integer, limit_count integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_today date;
  v_used integer;
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 1000));
begin
  -- The caller is service_role, so there is no auth.uid() to fall back on
  -- and a missing id must not quietly become "somebody".
  if p_user_id is null then
    raise exception 'A user id is required' using errcode = '22023';
  end if;

  if p_operation is null or p_operation !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'Invalid AI operation' using errcode = '22023';
  end if;

  v_today := public.ai_quota_local_day(p_user_id);

  insert into public.ai_usage_daily (
    user_id,
    usage_date,
    operation,
    request_count
  ) values (
    p_user_id,
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
      where user_id = p_user_id
        and usage_date = v_today
        and operation = p_operation;

    return query select false, coalesce(v_used, v_limit), v_limit;
    return;
  end if;

  return query select true, v_used, v_limit;
end;
$function$;

create or replace function public.refund_ai_daily_quota(
  p_user_id uuid,
  p_operation text
)
returns table(used integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_today date;
  v_used integer;
begin
  if p_user_id is null then
    raise exception 'A user id is required' using errcode = '22023';
  end if;

  if p_operation is null or p_operation !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'Invalid AI operation' using errcode = '22023';
  end if;

  v_today := public.ai_quota_local_day(p_user_id);

  -- greatest() rather than a plain subtraction: the table checks that the
  -- count is not negative, so a refund arriving without a matching charge
  -- must be a no-op and not an error the route has to handle.
  update public.ai_usage_daily
     set request_count = greatest(0, request_count - 1),
         updated_at = now()
   where user_id = p_user_id
     and usage_date = v_today
     and operation = p_operation
  returning request_count into v_used;

  return query select coalesce(v_used, 0);
end;
$function$;

-- ---------- who may call them ----------

-- revoke from public first: a bare CREATE FUNCTION grants EXECUTE to
-- PUBLIC, so granting service_role without this would leave the new
-- functions exactly as reachable as the ones they replace.
revoke all on function public.consume_ai_daily_quota(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.refund_ai_daily_quota(uuid, text)
  from public, anon, authenticated;

grant execute on function public.consume_ai_daily_quota(uuid, text, integer)
  to service_role;
grant execute on function public.refund_ai_daily_quota(uuid, text)
  to service_role;
