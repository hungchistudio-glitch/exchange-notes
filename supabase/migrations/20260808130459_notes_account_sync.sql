-- Make the notes table match the notes the app actually saves.
--
-- The app has always inserted user_id/english/chinese/source_name/source_url,
-- but the table carried an unrelated earlier shape (author_name, language,
-- content, context, status, ai_result) with three NOT NULL columns the insert
-- never supplied. RLS was enabled with no policies on top of that, so the
-- write failed twice over. The client caught the error, logged a warning and
-- fell back to localStorage — meaning notes have only ever existed on one
-- device and vanished with a reinstall.
--
-- The table is empty, so this reshapes it in place. The vestigial columns are
-- left in place but made nullable rather than dropped, pending a decision on
-- removing them.

alter table public.notes
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists english text,
  add column if not exists chinese text,
  add column if not exists source_name text,
  add column if not exists source_url text;

alter table public.notes
  alter column author_name drop not null,
  alter column language drop not null,
  alter column content drop not null;

alter table public.notes
  alter column created_at set default now();

-- Safe because the table holds no rows: verified 0 before writing this.
alter table public.notes
  alter column user_id set not null,
  alter column english set not null,
  alter column chinese set not null;

create index if not exists notes_user_created_idx
  on public.notes (user_id, created_at desc);

-- A note belongs to exactly one person and is never shared, so every policy
-- is a plain ownership check.
drop policy if exists "Users read their own notes" on public.notes;
create policy "Users read their own notes"
  on public.notes for select
  using (auth.uid() = user_id);

drop policy if exists "Users create their own notes" on public.notes;
create policy "Users create their own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own notes" on public.notes;
create policy "Users update their own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own notes" on public.notes;
create policy "Users delete their own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

comment on table public.notes is
  'Bilingual notes saved by a user, from the home composer or a Daily News card.';
