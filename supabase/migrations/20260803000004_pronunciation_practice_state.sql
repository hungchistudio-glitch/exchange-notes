-- Minimal, real persistence for the Pronunciation Lab's practice tracking
-- (Yumi pronunciation-system brief, section 22-23). We deliberately do NOT
-- build the brief's full speculative 11-table schema
-- (pronunciation_units/localizations/examples/audio/comparisons/mistakes,
-- yumi_rig_definitions, yumi_animation_timelines, etc.) — all pronunciation
-- content today is static bundled TypeScript data (lib/pronunciation/*.ts),
-- ships with zero latency, and there's no product need yet for a
-- server-editable CMS-style backend for it. What IS genuinely per-user,
-- dynamic, and worth persisting is practice activity: how many times
-- someone has replayed/practiced a given sound, and when they last did —
-- so that's the one table this migration adds.
create table if not exists public.pronunciation_practice_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_kind text not null check (unit_kind in ('english', 'zhuyin')),
  unit_id text not null,
  replay_count integer not null default 0,
  last_practiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_kind, unit_id)
);

alter table public.pronunciation_practice_state enable row level security;

create policy "Users can read their own pronunciation practice state"
  on public.pronunciation_practice_state
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pronunciation practice state"
  on public.pronunciation_practice_state
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pronunciation practice state"
  on public.pronunciation_practice_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
