-- One row that says when the news pool was last refilled outside the cron.
--
-- The nightly cron produced nothing on 2026-09-23..26 and two cards on the
-- 27th, and nothing tried again until the next night. lib/news/refillPool.ts
-- now finishes a short night from the news route, after it has answered —
-- and this row makes sure that happens at most once every few hours across
-- every server instance, rather than once per reader.
--
-- Claimed with a conditional UPDATE (started_at older than the window), so
-- two instances racing both run it and only one gets the row back.
-- Server-role access only.

create table if not exists public.daily_news_refill_lock (
  id text primary key,
  started_at timestamptz not null
);

comment on table public.daily_news_refill_lock is
  'When the daily news pool was last refilled outside the cron. Server-role access only.';

insert into public.daily_news_refill_lock (id, started_at)
values ('refill', '2000-01-01T00:00:00Z')
on conflict (id) do nothing;

alter table public.daily_news_refill_lock enable row level security;

revoke all on public.daily_news_refill_lock from anon, authenticated;
