-- Yumi Pocket Lookup's share-extension keys (Chi, 2026-11-12: 專用小鑰匙).
--
-- The share extension cannot use the app's sign-in (refreshing it from the
-- extension would sign the app out), so the app issues it a key of its own,
-- good for a lookup and a save and nothing else (lib/pocket/keys.ts).
--
-- Only the server reads or writes this table, through the service role:
-- RLS is on with no policies, and the client roles hold no privileges. The
-- key itself is never stored, only its SHA-256.

create table public.pocket_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  label text not null default 'iPhone' check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

comment on table public.pocket_keys is
  'Yumi Pocket Lookup share-extension keys: SHA-256 of each key, server-only (lib/pocket/keys.ts).';

create index pocket_keys_user_active
  on public.pocket_keys (user_id, created_at desc)
  where revoked_at is null;

alter table public.pocket_keys enable row level security;

revoke all on public.pocket_keys from anon, authenticated;
