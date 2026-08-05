-- Native iOS APNs device registrations.
--
-- APNs tokens are scoped to an app/device and can change. The native app
-- registers the latest token through an authenticated server route. The route
-- uses the service role only after confirming the current Supabase user.

alter table public.device_tokens
  add column if not exists environment text
    check (
      environment is null
      or environment in ('development', 'production')
    ),
  add column if not exists bundle_id text,
  add column if not exists enabled boolean
    not null default true,
  add column if not exists last_seen_at timestamptz;

-- A physical APNs token must belong to only one current account. This also
-- lets a new login safely transfer the same device installation.
create unique index if not exists
  device_tokens_platform_token_unique
  on public.device_tokens (platform, token);

create index if not exists
  device_tokens_user_platform_enabled_idx
  on public.device_tokens (
    user_id,
    platform,
    enabled
  );

update public.device_tokens
set
  enabled = coalesce(enabled, true),
  last_seen_at = coalesce(
    last_seen_at,
    updated_at,
    created_at
  )
where last_seen_at is null;
