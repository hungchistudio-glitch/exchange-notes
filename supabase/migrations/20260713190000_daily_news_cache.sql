create table if not exists public.daily_news_cache (
  id smallint primary key default 1,
  cards jsonb not null,
  generated_at timestamptz not null,
  fresh_until timestamptz not null,
  stale_until timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint daily_news_cache_single_row check (id = 1)
);

alter table public.daily_news_cache enable row level security;
