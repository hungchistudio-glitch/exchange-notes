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
;
