-- An earlier daily_news_cache table already existed with a different,
-- incompatible schema (a NOT NULL "fresh_until" column not used by the
-- current design), which was blocking the cron job's writes. It never held
-- a successfully written row, so it's safe to drop and recreate cleanly
-- with the schema this app actually uses.

drop table if exists public.daily_news_cache;

create table public.daily_news_cache (
  id smallint primary key default 1,
  cards jsonb not null,
  generated_at timestamptz not null default now(),
  constraint daily_news_cache_singleton check (id = 1)
);

alter table public.daily_news_cache enable row level security;

create policy "Daily news cache is publicly readable"
  on public.daily_news_cache
  for select
  using (true);

-- Intentionally no insert/update/delete policy: only the service-role key
-- (used exclusively by the cron route) can write to this table, since the
-- service role bypasses RLS entirely.
