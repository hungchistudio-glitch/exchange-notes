-- Exchange Notes Web Push subscriptions
--
-- Stores browser PushSubscription data for installed PWAs and supported
-- browsers. This is separate from device_tokens because device_tokens is
-- shaped for native FCM/APNs tokens, while Web Push requires an endpoint
-- plus the p256dh and auth encryption keys.

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users (id)
    on delete cascade,

  endpoint text not null,
  p256dh text not null,
  auth text not null,

  expiration_time bigint,
  user_agent text,
  device_name text,

  enabled boolean not null default true,
  last_used_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint web_push_subscriptions_endpoint_key unique (endpoint)
);

create index if not exists web_push_subscriptions_user_enabled_idx
  on public.web_push_subscriptions (user_id, enabled);

alter table public.web_push_subscriptions enable row level security;

do $$
begin
  create policy "Users can view their own web push subscriptions"
    on public.web_push_subscriptions
    for select
    to authenticated
    using (user_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy "Users can create their own web push subscriptions"
    on public.web_push_subscriptions
    for insert
    to authenticated
    with check (user_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy "Users can update their own web push subscriptions"
    on public.web_push_subscriptions
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy "Users can delete their own web push subscriptions"
    on public.web_push_subscriptions
    for delete
    to authenticated
    using (user_id = auth.uid());
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_web_push_subscription_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_web_push_subscription_updated_at
  on public.web_push_subscriptions;

create trigger set_web_push_subscription_updated_at
before update on public.web_push_subscriptions
for each row
execute function public.set_web_push_subscription_updated_at();
