-- Exchange Notes: vocabulary-first foundation
create extension if not exists pgcrypto;

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  translation text not null,
  language text not null default 'english' check (language in ('english', 'traditional-chinese')),
  part_of_speech text,
  example_sentence text,
  translated_example text,
  image_url text,
  confidence text check (confidence in ('high', 'medium', 'low')),
  status text not null default 'new' check (status in ('new', 'learning', 'mastered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vocabulary_items_user_created_idx
  on public.vocabulary_items (user_id, created_at desc);

alter table public.vocabulary_items enable row level security;

drop policy if exists "Users can view own vocabulary" on public.vocabulary_items;
create policy "Users can view own vocabulary"
  on public.vocabulary_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own vocabulary" on public.vocabulary_items;
create policy "Users can insert own vocabulary"
  on public.vocabulary_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own vocabulary" on public.vocabulary_items;
create policy "Users can update own vocabulary"
  on public.vocabulary_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own vocabulary" on public.vocabulary_items;
create policy "Users can delete own vocabulary"
  on public.vocabulary_items for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vocabulary-images',
  'vocabulary-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own vocabulary images" on storage.objects;
create policy "Users upload own vocabulary images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vocabulary-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own vocabulary images" on storage.objects;
create policy "Users update own vocabulary images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vocabulary-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own vocabulary images" on storage.objects;
create policy "Users delete own vocabulary images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vocabulary-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
