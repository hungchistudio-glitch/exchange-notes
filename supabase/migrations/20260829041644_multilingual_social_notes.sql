-- One note, many language views.
--
-- This evolves the existing bilingual notes table in place. Existing rows and
-- the legacy english/chinese columns stay intact so an older app build can run
-- during a rolling deploy. New code reads original_text/original_language and
-- treats translations and Yumi guidance as cached interpretation layers.

alter table public.notes
  add column if not exists original_text text,
  add column if not exists original_language text,
  add column if not exists personal_meaning text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists privacy text not null default 'private',
  add column if not exists source_kind text not null default 'manual',
  add column if not exists source_note_id uuid references public.notes (id) on delete set null,
  add column if not exists source_owner_id uuid references auth.users (id) on delete set null,
  add column if not exists source_owner_name text,
  add column if not exists updated_at timestamptz not null default now();

update public.notes
set
  original_text = coalesce(
    nullif(btrim(content), ''),
    nullif(btrim(english), ''),
    nullif(btrim(chinese), ''),
    ''
  ),
  original_language = case
    when language in ('en', 'english') then 'en'
    when language in ('zh-TW', 'traditional-chinese', 'zh', 'chinese') then 'zh-TW'
    when language in ('es', 'spanish') then 'es'
    when language in ('fr', 'french') then 'fr'
    when language in ('it', 'italian') then 'it'
    when coalesce(nullif(btrim(english), ''), '') = ''
      and coalesce(nullif(btrim(chinese), ''), '') <> '' then 'zh-TW'
    else 'en'
  end
where original_text is null or original_language is null;

alter table public.notes
  alter column original_text set not null,
  alter column original_language set not null;

alter table public.notes
  drop constraint if exists notes_original_language_check,
  add constraint notes_original_language_check
    check (original_language in ('en', 'zh-TW', 'es', 'fr', 'it')),
  drop constraint if exists notes_privacy_check,
  add constraint notes_privacy_check
    check (privacy in ('private', 'shared')),
  drop constraint if exists notes_source_kind_check,
  add constraint notes_source_kind_check
    check (source_kind in ('manual', 'search', 'news', 'shared'));

create table if not exists public.note_interpretations (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  target_language text not null
    check (target_language in ('en', 'zh-TW', 'es', 'fr', 'it')),
  natural_translation text not null,
  meaning text not null default '',
  local_expressions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(local_expressions) = 'array'),
  tone text not null default '',
  cultural_nuance text not null default '',
  usage_examples jsonb not null default '[]'::jsonb
    check (jsonb_typeof(usage_examples) = 'array'),
  warnings jsonb not null default '[]'::jsonb
    check (jsonb_typeof(warnings) = 'array'),
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_id, target_language)
);

create table if not exists public.note_shares (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  permission text not null default 'view' check (permission = 'view'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (note_id, recipient_id),
  check (owner_id <> recipient_id)
);

create index if not exists notes_original_language_created_idx
  on public.notes (user_id, original_language, created_at desc);
create index if not exists notes_tags_idx
  on public.notes using gin (tags);
create index if not exists notes_source_note_idx
  on public.notes (source_note_id)
  where source_note_id is not null;
create index if not exists notes_source_owner_idx
  on public.notes (source_owner_id)
  where source_owner_id is not null;
create index if not exists note_interpretations_target_idx
  on public.note_interpretations (target_language);
create index if not exists note_shares_recipient_active_idx
  on public.note_shares (recipient_id, created_at desc)
  where revoked_at is null;
create index if not exists note_shares_owner_active_idx
  on public.note_shares (owner_id, note_id)
  where revoked_at is null;

-- Keep legacy translations without making a model call. They become cached
-- layers only when there is actual text in the historical column.
insert into public.note_interpretations (
  note_id,
  target_language,
  natural_translation,
  model,
  created_at,
  updated_at
)
select id, 'en', english, 'legacy-import', created_at, created_at
from public.notes
where nullif(btrim(english), '') is not null
on conflict (note_id, target_language) do nothing;

insert into public.note_interpretations (
  note_id,
  target_language,
  natural_translation,
  model,
  created_at,
  updated_at
)
select id, 'zh-TW', chinese, 'legacy-import', created_at, created_at
from public.notes
where nullif(btrim(chinese), '') is not null
on conflict (note_id, target_language) do nothing;

alter table public.note_interpretations enable row level security;
alter table public.note_shares enable row level security;

-- This helper exists only to keep the notes policy from recursively querying
-- note_shares through itself. It is in a non-exposed schema, has an empty
-- search_path, accepts the reader explicitly, and returns one boolean.
create schema if not exists private;

create or replace function private.has_active_note_share(
  checked_note_id uuid,
  reader_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.note_shares share
    where share.note_id = checked_note_id
      and share.recipient_id = reader_id
      and share.revoked_at is null
  );
$$;

revoke all on function private.has_active_note_share(uuid, uuid) from public;
revoke all on function private.has_active_note_share(uuid, uuid) from anon;
grant execute on function private.has_active_note_share(uuid, uuid) to authenticated;

drop policy if exists "Users read their own notes" on public.notes;
drop policy if exists "Owners and recipients read notes" on public.notes;
create policy "Owners and recipients read notes"
  on public.notes for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_active_note_share(id, (select auth.uid()))
  );

drop policy if exists "Users create their own notes" on public.notes;
create policy "Users create their own notes"
  on public.notes for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users update their own notes" on public.notes;
create policy "Users update their own notes"
  on public.notes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users delete their own notes" on public.notes;
create policy "Users delete their own notes"
  on public.notes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Note readers view cached interpretations"
  on public.note_interpretations for select to authenticated
  using (
    exists (
      select 1
      from public.notes note
      where note.id = note_interpretations.note_id
    )
  );

create policy "Owners and recipients view note shares"
  on public.note_shares for select to authenticated
  using (
    owner_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );

create policy "Owners share notes with friends"
  on public.note_shares for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.notes note
      where note.id = note_shares.note_id
        and note.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.friendships friendship
      where
        (friendship.user_one_id = owner_id and friendship.user_two_id = recipient_id)
        or (friendship.user_two_id = owner_id and friendship.user_one_id = recipient_id)
    )
  );

create policy "Owners update note shares"
  on public.note_shares for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete note shares"
  on public.note_shares for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all privileges on table public.notes from anon;
revoke all privileges on table public.note_interpretations from anon;
revoke all privileges on table public.note_shares from anon;
revoke all privileges on table public.notes from authenticated;
revoke all privileges on table public.note_interpretations from authenticated;
revoke all privileges on table public.note_shares from authenticated;

grant select, insert, update, delete on table public.notes to authenticated;
grant select on table public.note_interpretations to authenticated;
grant select, insert, update, delete on table public.note_shares to authenticated;

comment on table public.notes is
  'Canonical personal notes. Language-specific renderings are cached separately.';
comment on table public.note_interpretations is
  'On-demand Yumi interpretations of a note, unique per target language.';
comment on table public.note_shares is
  'Direct friend shares. MVP permission is view-only and can be revoked.';
