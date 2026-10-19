-- Yumi's bilingual hello (lib/hello): a reader's own Yumi, dressed as she is,
-- carrying one word in two languages to anyone holding the link (Chi,
-- 2026-10-19). A new table, new functions and a new bucket; the one thing
-- that exists and changes is prepare_account_deletion, which now also lists
-- a reader's hello posters (at the end of this file), so deleting an account
-- leaves none of them behind.
--
-- Who can do what:
--   anyone     read one hello by id, through get_yumi_hello, which returns
--              only the public snapshot — never a table, never the owner's
--              account id, and nothing of a hello that has been turned off
--   the owner  list their own (RLS) and turn one off (revoke_yumi_hello)
--   the server create, fill a missing language and attach the poster, as
--              service_role, after checking the session itself; nobody can
--              insert or update a row directly
--
-- The snapshot is taken here, from the database's own copies — the outfit
-- the wear function validated against what the reader owns, and the
-- profile's public name and Exchange ID — so a hello cannot carry an outfit
-- or a name its owner does not have.

create table if not exists public.yumi_hellos (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{12}$'),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- One create per key: a double tap returns the first hello, not a second.
  request_key text not null check (char_length(request_key) between 8 and 64),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  version smallint not null default 1,
  sender_name text,
  sender_exchange_id text not null,
  outfit jsonb not null default '{}'::jsonb,
  mode text not null check (mode in ('standard', 'yumi-cosmic')),
  poster_path text,
  pair text[] not null check (
    array_length(pair, 1) = 2
    and pair[1] <> pair[2]
    and pair <@ array['en', 'zh-TW', 'es', 'fr', 'it']::text[]
  ),
  source_language text not null check (source_language in ('en', 'zh-TW', 'es', 'fr', 'it')),
  -- { "<language>": { "text", "partOfSpeech"?, "phonetic"? } }, at most five.
  sense jsonb not null check (jsonb_typeof(sense) = 'object'),
  -- A visitor's "try again" on a missing language is bounded per hello.
  fill_attempts smallint not null default 0,
  last_fill_at timestamptz,
  unique (owner_id, request_key)
);

create index if not exists yumi_hellos_owner_created
  on public.yumi_hellos (owner_id, created_at desc);

alter table public.yumi_hellos enable row level security;

drop policy if exists "Owners can read their own hellos" on public.yumi_hellos;
create policy "Owners can read their own hellos"
  on public.yumi_hellos
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

revoke all on table public.yumi_hellos from public, anon, authenticated;
grant select on table public.yumi_hellos to authenticated;

-- ── Reading one, for anyone ──────────────────────────────────────────────

create or replace function public.get_yumi_hello(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when hello.id is null then null
    when hello.revoked_at is not null then pg_catalog.jsonb_build_object('status', 'revoked')
    else pg_catalog.jsonb_build_object(
      'status', 'active',
      'hello', pg_catalog.jsonb_build_object(
        'id', hello.id,
        'version', hello.version,
        'createdAt', hello.created_at,
        -- The name as it was sent; the Exchange ID as it is now. An Exchange
        -- ID can be changed and then taken by someone else, and the page's
        -- friend button and account QR must reach the sharer, not whoever
        -- holds their old ID. No profile, no ID: the page shows the hello as
        -- missing rather than pointing anywhere.
        'sender', pg_catalog.jsonb_build_object(
          'name', hello.sender_name,
          'exchangeId', owner.exchange_id
        ),
        'yumi', pg_catalog.jsonb_build_object(
          'outfit', hello.outfit,
          'mode', hello.mode,
          'posterPath', hello.poster_path
        ),
        'pair', pg_catalog.to_jsonb(hello.pair),
        'source', hello.source_language,
        'sense', hello.sense
      )
    )
  end
  from (select 1) as one
  left join public.yumi_hellos as hello on hello.id = p_id
  left join public.profiles as owner on owner.id = hello.owner_id;
$$;

revoke all on function public.get_yumi_hello(text) from public;
grant execute on function public.get_yumi_hello(text) to anon, authenticated, service_role;

-- ── Turning one off, for its owner ───────────────────────────────────────

create or replace function public.revoke_yumi_hello(p_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.yumi_hellos
  set revoked_at = coalesce(revoked_at, pg_catalog.now())
  where id = p_id and owner_id = v_actor;

  return found;
end;
$$;

revoke all on function public.revoke_yumi_hello(text) from public, anon;
grant execute on function public.revoke_yumi_hello(text) to authenticated;

-- ── Creating one, for the server ─────────────────────────────────────────

create or replace function public.create_yumi_hello(
  p_owner uuid,
  p_id text,
  p_request_key text,
  p_mode text,
  p_pair text[],
  p_source text,
  p_sense jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing text;
  v_recent integer;
  v_name text;
  v_exchange_id text;
  v_outfit jsonb;
begin
  -- The same key again is the same hello: a double tap, a retry after a
  -- dropped response.
  select id into v_existing
  from public.yumi_hellos
  where owner_id = p_owner and request_key = p_request_key;

  if v_existing is not null then
    return pg_catalog.jsonb_build_object('id', v_existing, 'created', false);
  end if;

  select count(*) into v_recent
  from public.yumi_hellos
  where owner_id = p_owner and created_at > pg_catalog.now() - interval '1 day';

  if v_recent >= 30 then
    raise exception 'Too many hellos today' using errcode = '53400';
  end if;

  select nullif(pg_catalog.btrim(profile.display_name), ''), profile.exchange_id
  into v_name, v_exchange_id
  from public.profiles as profile
  where profile.id = p_owner;

  if v_exchange_id is null then
    raise exception 'Profile not found' using errcode = '22023';
  end if;

  select coalesce(wardrobe.outfit, '{}'::jsonb)
  into v_outfit
  from public.yumi_wardrobe as wardrobe
  where wardrobe.user_id = p_owner;

  insert into public.yumi_hellos (
    id, owner_id, request_key, sender_name, sender_exchange_id,
    outfit, mode, pair, source_language, sense
  )
  values (
    p_id, p_owner, p_request_key, v_name, v_exchange_id,
    coalesce(v_outfit, '{}'::jsonb), p_mode, p_pair, p_source, p_sense
  );

  return pg_catalog.jsonb_build_object('id', p_id, 'created', true);
end;
$$;

revoke all on function public.create_yumi_hello(uuid, text, text, text, text[], text, jsonb) from public, anon, authenticated;
grant execute on function public.create_yumi_hello(uuid, text, text, text, text[], text, jsonb) to service_role;

-- ── Attaching the poster, for the server ─────────────────────────────────

create or replace function public.set_yumi_hello_poster(p_owner uuid, p_id text, p_path text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.yumi_hellos
  set poster_path = p_path
  where id = p_id and owner_id = p_owner and revoked_at is null;

  return found;
end;
$$;

revoke all on function public.set_yumi_hello_poster(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_yumi_hello_poster(uuid, text, text) to service_role;

-- ── Filling a missing language, for the server ───────────────────────────
--
-- A visitor may ask for a language the hello was made without. The server
-- first claims an attempt here: at most three per hello, at least a minute
-- apart, and only for a live hello still missing that language. Without a
-- claim it does not reach the model at all — this is not a way to have
-- arbitrary text translated.

create or replace function public.claim_yumi_hello_fill(p_id text, p_language text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hello public.yumi_hellos;
begin
  if p_language not in ('en', 'zh-TW', 'es', 'fr', 'it') then
    return null;
  end if;

  update public.yumi_hellos
  set fill_attempts = fill_attempts + 1,
      last_fill_at = pg_catalog.now()
  where id = p_id
    and revoked_at is null
    and not (sense ? p_language)
    and fill_attempts < 3
    and (last_fill_at is null or last_fill_at < pg_catalog.now() - interval '1 minute')
  returning * into v_hello;

  if v_hello.id is null then
    return null;
  end if;

  return pg_catalog.jsonb_build_object(
    'pair', pg_catalog.to_jsonb(v_hello.pair),
    'source', v_hello.source_language,
    'sense', v_hello.sense
  );
end;
$$;

revoke all on function public.claim_yumi_hello_fill(text, text) from public, anon, authenticated;
grant execute on function public.claim_yumi_hello_fill(text, text) to service_role;

create or replace function public.fill_yumi_hello_language(p_id text, p_language text, p_side jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_language not in ('en', 'zh-TW', 'es', 'fr', 'it') or pg_catalog.jsonb_typeof(p_side) <> 'object' then
    return false;
  end if;

  update public.yumi_hellos
  set sense = sense || pg_catalog.jsonb_build_object(p_language, p_side)
  where id = p_id and revoked_at is null and not (sense ? p_language);

  return found;
end;
$$;

revoke all on function public.fill_yumi_hello_language(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.fill_yumi_hello_language(text, text, jsonb) to service_role;

-- ── Posters ──────────────────────────────────────────────────────────────
--
-- Public to read (the page, the shared image and link previews show them),
-- written only by the server, PNG only, at most 2 MB. Paths are
-- <hello id>/<random>.png, as unguessable as the hello itself, and are
-- deleted when the hello is turned off.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yumi-hellos', 'yumi-hellos', true, 2097152, array['image/png'])
on conflict (id) do nothing;

-- ── Account deletion takes the posters too ───────────────────────────────
--
-- prepare_account_deletion (20261015120000) lists what a reader owns for the
-- Storage API to remove. Posters are uploaded by the server, so they have no
-- owner_id, and their folder is the hello's id rather than the reader's: they
-- are found through the reader's hellos instead. Must run before the user is
-- deleted, while the hellos still name their owner — which is the order
-- app/api/account/route.ts already keeps. Otherwise as it was, line for line.

create or replace function public.prepare_account_deletion(p_user_id uuid)
returns table (bucket_id text, object_name text)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- The caller is service_role, so there is no auth.uid() to fall back on
  -- and a missing id must not quietly match nothing or everything.
  if p_user_id is null then
    raise exception 'A user id is required' using errcode = '22023';
  end if;

  -- Made by hand and outside this chain, so it may not exist everywhere.
  if to_regclass('public.vocabulary_examples_backup_20260831') is not null then
    execute 'delete from public.vocabulary_examples_backup_20260831 where user_id = $1'
      using p_user_id;
  end if;

  -- Every file is uploaded by its reader's own session, so owner_id names
  -- them; the folder is checked too for the two buckets keyed by user, in
  -- case a file ever arrives there through the service role, ownerless.
  -- Hello posters are always ownerless, and filed under the hello's id.
  return query
    select o.bucket_id, o.name
      from storage.objects o
     where o.owner_id = p_user_id::text
        or (
          o.bucket_id in ('avatars', 'vocabulary-images')
          and split_part(o.name, '/', 1) = p_user_id::text
        )
        or (
          o.bucket_id = 'yumi-hellos'
          and exists (
            select 1
              from public.yumi_hellos h
             where h.id = split_part(o.name, '/', 1)
               and h.owner_id = p_user_id
          )
        );
end;
$function$;

revoke all on function public.prepare_account_deletion(uuid)
  from public, anon, authenticated;

grant execute on function public.prepare_account_deletion(uuid)
  to service_role;
