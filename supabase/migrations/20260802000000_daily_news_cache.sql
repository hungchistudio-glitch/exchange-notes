-- Daily News is now generated once per day by a scheduled cron job
-- (app/api/cron/daily-news/route.ts) instead of on every page load. This
-- single-row table holds the latest generated batch so the public
-- app/api/daily-news/route.ts endpoint can serve it to every user for
-- free, with zero Gemini/Google Search calls on the request path.

create table if not exists public.daily_news_cache (
  id smallint primary key default 1,
  cards jsonb not null,
  generated_at timestamptz not null default now(),
  constraint daily_news_cache_singleton check (id = 1)
);

alter table public.daily_news_cache enable row level security;

-- Anyone (including anonymous/unauthenticated requests) can read the
-- cached news — it's not user-specific data.
create policy "Daily news cache is publicly readable"
  on public.daily_news_cache
  for select
  using (true);

-- Intentionally no insert/update/delete policy: only the service-role key
-- (used exclusively by the cron route) can write to this table, since the
-- service role bypasses RLS entirely.
