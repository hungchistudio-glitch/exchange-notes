-- Persistent per-user AI quota accounting.
--
-- The browser cannot read or mutate these counters directly. Authenticated
-- clients can only call the atomic security-definer function below, which
-- derives the user id from auth.uid() and never trusts a caller-supplied id.

create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  operation text not null check (operation ~ '^[a-z0-9_-]{1,40}$'),
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date, operation)
);

alter table public.ai_usage_daily enable row level security;

revoke all privileges on table public.ai_usage_daily from anon, authenticated;

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
  v_today date := (timezone('utc', now()))::date;
  v_used integer;
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 1000));
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_operation is null or p_operation !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'Invalid AI operation' using errcode = '22023';
  end if;

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
grant execute on function public.consume_ai_daily_quota(text, integer) to authenticated;

comment on table public.ai_usage_daily is
  'Server-controlled daily AI request counters keyed by authenticated user.';
