-- Exchange Notes V3: vocabulary collections
create table if not exists public.vocabulary_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '📚',
  color text not null default 'sand',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create table if not exists public.vocabulary_collection_items (
  collection_id uuid not null references public.vocabulary_collections(id) on delete cascade,
  vocabulary_item_id uuid not null references public.vocabulary_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, vocabulary_item_id)
);
create index if not exists vocabulary_collections_user_idx
  on public.vocabulary_collections (user_id, created_at);
create index if not exists vocabulary_collection_items_vocabulary_idx
  on public.vocabulary_collection_items (vocabulary_item_id);
alter table public.vocabulary_collections enable row level security;
alter table public.vocabulary_collection_items enable row level security;
drop policy if exists "Users manage own collections" on public.vocabulary_collections;
create policy "Users manage own collections"
  on public.vocabulary_collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users view own collection items" on public.vocabulary_collection_items;
create policy "Users view own collection items"
  on public.vocabulary_collection_items for select
  using (
    exists (
      select 1 from public.vocabulary_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );
drop policy if exists "Users add own collection items" on public.vocabulary_collection_items;
create policy "Users add own collection items"
  on public.vocabulary_collection_items for insert
  with check (
    exists (
      select 1 from public.vocabulary_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
    and exists (
      select 1 from public.vocabulary_items v
      where v.id = vocabulary_item_id and v.user_id = auth.uid()
    )
  );
drop policy if exists "Users remove own collection items" on public.vocabulary_collection_items;
create policy "Users remove own collection items"
  on public.vocabulary_collection_items for delete
  using (
    exists (
      select 1 from public.vocabulary_collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );
