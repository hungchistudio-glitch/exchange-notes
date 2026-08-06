-- Scriptable Yumi Widget server storage.
--
-- This migration intentionally creates server-only tables:
--
-- 1. scriptable_yumi_snapshots stores one latest Widget snapshot per user.
-- 2. scriptable_yumi_tokens stores only a SHA-256 token hash.
--
-- Plaintext Scriptable tokens must never be stored in PostgreSQL.
-- Anonymous and authenticated database roles receive no direct table access.
-- Access is performed only by validated server routes using the service role.

create table if not exists public.scriptable_yumi_snapshots (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  schema_version integer not null
    check (
      schema_version >= 1
      and schema_version <= 1000
    ),

  payload jsonb not null
    check (
      jsonb_typeof(payload) = 'object'
      and octet_length(payload::text) <= 65536
    ),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);

create index if not exists
  scriptable_yumi_snapshots_updated_at_idx
  on public.scriptable_yumi_snapshots (
    updated_at desc
  );

alter table
  public.scriptable_yumi_snapshots
  enable row level security;

-- No user-facing policies are intentionally created.
-- All access must pass through authenticated or bearer-gated server routes.
revoke all privileges
  on table public.scriptable_yumi_snapshots
  from anon, authenticated;

comment on table
  public.scriptable_yumi_snapshots
  is 'Latest validated Scriptable Yumi Widget snapshot for each user.';

comment on column
  public.scriptable_yumi_snapshots.payload
  is 'Validated YumiWidgetUpdatePayload JSON; maximum serialized size 64 KiB.';


create table if not exists public.scriptable_yumi_tokens (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  token_hash text not null unique
    check (
      token_hash ~ '^[0-9a-f]{64}$'
    ),

  token_prefix text not null
    check (
      char_length(token_prefix) >= 8
      and char_length(token_prefix) <= 24
    ),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  last_used_at timestamptz,

  revoked_at timestamptz,

  check (
    last_used_at is null
    or last_used_at >= created_at
  ),

  check (
    revoked_at is null
    or revoked_at >= created_at
  )
);

alter table
  public.scriptable_yumi_tokens
  enable row level security;

-- Token hashes are deliberately unavailable to browser database clients.
revoke all privileges
  on table public.scriptable_yumi_tokens
  from anon, authenticated;

comment on table
  public.scriptable_yumi_tokens
  is 'SHA-256 hashes for personal Scriptable Widget bearer tokens.';

comment on column
  public.scriptable_yumi_tokens.token_hash
  is 'Lowercase hexadecimal SHA-256 hash. Never store the plaintext token.';

comment on column
  public.scriptable_yumi_tokens.token_prefix
  is 'Non-secret prefix displayed only to help identify the current token.';
