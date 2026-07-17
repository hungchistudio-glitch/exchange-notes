alter table public.vocabulary_items
  add column if not exists review_repetitions integer not null default 0,
  add column if not exists review_lapses integer not null default 0,
  add column if not exists retention_score integer not null default 100,
  add column if not exists difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard'));

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_item_id uuid not null references public.vocabulary_items(id) on delete cascade,
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  interval_days numeric not null,
  ease_factor numeric not null,
  response_time_ms integer,
  created_at timestamptz not null default now()
);

alter table public.review_events enable row level security;

drop policy if exists "Users can view own review events" on public.review_events;
create policy "Users can view own review events"
  on public.review_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own review events" on public.review_events;
create policy "Users can insert own review events"
  on public.review_events for insert
  with check (auth.uid() = user_id);

create index if not exists review_events_user_created_idx
  on public.review_events (user_id, created_at desc);
create index if not exists review_events_vocabulary_idx
  on public.review_events (vocabulary_item_id, created_at desc);
