-- Exchange Notes: Daily News "Save to Notes"
create extension if not exists pgcrypto;

create table if not exists public.saved_news_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null,
  category text,
  english_title text not null,
  chinese_title text,
  english_summary text not null,
  chinese_summary text,
  vocabulary jsonb not null default '[]'::jsonb,
  source_name text not null,
  source_url text not null,
  image_url text,
  published_at timestamptz,
  saved_at timestamptz not null default now(),
  unique (user_id, article_id)
);

create index if not exists saved_news_articles_user_saved_idx
  on public.saved_news_articles (user_id, saved_at desc);

alter table public.saved_news_articles enable row level security;

drop policy if exists "Users can view own saved news" on public.saved_news_articles;
create policy "Users can view own saved news"
  on public.saved_news_articles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can save own news" on public.saved_news_articles;
create policy "Users can save own news"
  on public.saved_news_articles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own saved news" on public.saved_news_articles;
create policy "Users can update own saved news"
  on public.saved_news_articles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved news" on public.saved_news_articles;
create policy "Users can delete own saved news"
  on public.saved_news_articles for delete
  using (auth.uid() = user_id);
