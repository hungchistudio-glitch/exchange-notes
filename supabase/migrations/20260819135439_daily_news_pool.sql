-- Daily News becomes a rolling pool instead of a single overwritten batch.
--
-- Until now the whole feed lived in daily_news_cache: one row, id = 1,
-- replaced by the cron job every day. That is why refreshing Discover could
-- only ever answer "you are already seeing today's stories" — there was
-- nothing else to serve. Every user also saw exactly the same five cards,
-- and re-opening the app during the day showed them again.
--
-- Two tables replace it. daily_news_items accumulates cards, so the app has
-- an inventory rather than a snapshot; daily_news_seen records what each
-- reader has already been shown, so the feed can hand out something new
-- instead of the same thing again. The cron job appends to the first and
-- prunes it; nothing but the service role ever writes to it.
--
-- daily_news_cache is deliberately left in place. It still holds the last
-- batch generated under the old design, and dropping a table is the one step
-- in this change that cannot be undone by re-running a migration. A later
-- migration can remove it once the pool has been serving in production long
-- enough to trust.

create table if not exists public.daily_news_items (
  id uuid primary key default gen_random_uuid(),
  card jsonb not null,
  category text not null,

  -- The article this card was built from. Unique, because the Guardian's
  -- "newest in this section" is the same article on a slow news day, and
  -- ingesting it twice would spend tokens producing a card the pool already
  -- has and then show a reader a repeat that the seen table would consider
  -- new.
  source_url text not null unique,

  published_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- The feed is always "newest the reader has not seen", so both columns are
-- read on every request.
create index if not exists daily_news_items_published_idx
  on public.daily_news_items (published_at desc);

create index if not exists daily_news_items_created_idx
  on public.daily_news_items (created_at desc);

alter table public.daily_news_items enable row level security;

-- Same reasoning as the old cache: the pool is not user-specific data, and
-- the Discover feed is readable before sign-in.
create policy "Daily news pool is publicly readable"
  on public.daily_news_items
  for select
  using (true);

-- Intentionally no insert/update/delete policy. Only the service-role client
-- used by app/api/cron/daily-news/route.ts writes here, and the service role
-- bypasses RLS entirely.

create table if not exists public.daily_news_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.daily_news_items(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Every read is "which of these has this user seen", so the user column
-- leads. The primary key already covers (user_id, item_id) lookups.
create index if not exists daily_news_seen_user_idx
  on public.daily_news_seen (user_id, seen_at desc);

alter table public.daily_news_seen enable row level security;

-- auth.uid() is wrapped in a select so Postgres evaluates it once per query
-- as an InitPlan rather than once per row — the same treatment every other
-- policy in this schema was given.
create policy "Users can view own seen news"
  on public.daily_news_seen
  for select
  using ((select auth.uid()) = user_id);

create policy "Users can record own seen news"
  on public.daily_news_seen
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can forget own seen news"
  on public.daily_news_seen
  for delete
  using ((select auth.uid()) = user_id);
