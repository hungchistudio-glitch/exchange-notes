-- Per-user persisted state for the "Murph" vocabulary-page companion pet
-- (replaces the old Dashboard). One row per user, holding which vocabulary
-- words have already been "fed" to Murph as cookies, a running cookie
-- total (drives Murph's growth stage), and timestamps used to compute
-- mood (e.g. "missed you" after a long absence).

create table if not exists public.murph_pet_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  fed_word_ids uuid[] not null default '{}',
  total_cookies_fed integer not null default 0,
  last_fed_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.murph_pet_state enable row level security;

create policy "Users can read their own pet state"
  on public.murph_pet_state
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pet state"
  on public.murph_pet_state
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pet state"
  on public.murph_pet_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
