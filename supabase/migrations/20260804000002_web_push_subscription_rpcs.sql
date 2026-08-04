-- Secure authenticated helpers for registering and disabling browser
-- Web Push subscriptions.
--
-- The browser never supplies a user_id. Both functions derive the current
-- user from auth.uid(), preventing one user from registering or disabling
-- another user's subscription.
--
-- SECURITY DEFINER is required so a subscription endpoint previously used
-- by a different signed-in account on the same device can safely be claimed
-- by the current account despite the table's row-level security policies.

create or replace function public.register_web_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_expiration_time bigint default null,
  p_user_agent text default null,
  p_device_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription_id uuid;
  v_endpoint text := trim(p_endpoint);
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if
    v_endpoint is null
    or length(v_endpoint) < 10
    or length(v_endpoint) > 2048
    or lower(v_endpoint) not like 'https://%'
  then
    raise exception 'Invalid push endpoint'
      using errcode = '22023';
  end if;

  if
    p_p256dh is null
    or length(p_p256dh) < 16
    or length(p_p256dh) > 512
  then
    raise exception 'Invalid p256dh key'
      using errcode = '22023';
  end if;

  if
    p_auth is null
    or length(p_auth) < 8
    or length(p_auth) > 256
  then
    raise exception 'Invalid auth key'
      using errcode = '22023';
  end if;

  if p_user_agent is not null and length(p_user_agent) > 1024 then
    raise exception 'User agent is too long'
      using errcode = '22023';
  end if;

  if p_device_name is not null and length(p_device_name) > 120 then
    raise exception 'Device name is too long'
      using errcode = '22023';
  end if;

  insert into public.web_push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    expiration_time,
    user_agent,
    device_name,
    enabled
  )
  values (
    v_user_id,
    v_endpoint,
    p_p256dh,
    p_auth,
    p_expiration_time,
    nullif(trim(p_user_agent), ''),
    nullif(trim(p_device_name), ''),
    true
  )
  on conflict (endpoint)
  do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    expiration_time = excluded.expiration_time,
    user_agent = excluded.user_agent,
    device_name = excluded.device_name,
    enabled = true,
    updated_at = now()
  returning id into v_subscription_id;

  return v_subscription_id;
end;
$$;

create or replace function public.unregister_web_push_subscription(
  p_endpoint text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_affected_rows integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_endpoint is null or trim(p_endpoint) = '' then
    raise exception 'Push endpoint is required'
      using errcode = '22023';
  end if;

  update public.web_push_subscriptions
  set
    enabled = false,
    updated_at = now()
  where
    user_id = v_user_id
    and endpoint = trim(p_endpoint)
    and enabled = true;

  get diagnostics v_affected_rows = row_count;

  return v_affected_rows > 0;
end;
$$;

revoke all
on function public.register_web_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
)
from public;

grant execute
on function public.register_web_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
)
to authenticated;

revoke all
on function public.unregister_web_push_subscription(text)
from public;

grant execute
on function public.unregister_web_push_subscription(text)
to authenticated;

comment on function public.register_web_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
)
is 'Registers or refreshes a Web Push subscription for the authenticated user.';

comment on function public.unregister_web_push_subscription(text)
is 'Disables a Web Push subscription belonging to the authenticated user.';
