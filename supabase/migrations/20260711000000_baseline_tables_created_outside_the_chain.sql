-- The tables this directory has always assumed and never created.
--
-- `supabase db reset` on an empty database used to fail on the third file:
-- 20260713173000_add_shared_article alters public.messages, which nothing
-- before it creates. Several tables reached production through the dashboard
-- rather than a migration, and the chain has been altering them ever since.
--
-- Two shapes of the same fault:
--
--   vocabulary_items, notes    created in the dashboard, never in any
--                              migration, at any point
--   the messaging tables       captured by
--                              20260803022302_backfill_messaging_profiles_baseline
--                              three weeks after the migrations that alter them
--
-- This file creates all of them, in the shape they had *before* the chain
-- started changing them — the columns later migrations add are left for
-- those migrations to add, so replaying the whole directory produces the
-- same schema production has rather than a rearrangement of it.
--
-- Every statement is `if not exists`, so this is a no-op against production
-- and against any database built from the chain since.

-- ---------- vocabulary_items ----------
--
-- Columns 1-13 by ordinal position, which is the order they were created in.
-- `category` arrives in 20260713221500, the review columns in
-- 20260717010000, and the language-axis columns from 20260821225803 onward.

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  translation text not null,
  language text not null default 'english',
  part_of_speech text,
  example_sentence text,
  translated_example text,
  image_url text,
  confidence text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vocabulary_items enable row level security;

-- ---------- notes ----------
--
-- Columns 1-8. Everything from user_id onward belongs to
-- 20260808130459_notes_account_sync and 20260829044233_multilingual_social_notes.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  author_name text,
  language text,
  content text,
  context text,
  status text default 'waiting',
  ai_result jsonb,
  created_at timestamptz default now()
);

alter table public.notes enable row level security;

-- ---------- the messaging tables ----------
--
-- Identical to the create-table statements in
-- 20260803022302_backfill_messaging_profiles_baseline, which reconstructed
-- them from the live schema on 2026-08-02. That file keeps them: it is all
-- `if not exists`, so it becomes a no-op here and still does its own work
-- against a database that reached it the old way.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id),
  exchange_id text not null unique check (exchange_id ~ '^[a-z0-9_]{3,24}$'),
  email text not null unique,
  display_name text,
  avatar_url text,
  native_language text check (native_language = any (array['english', 'traditional-chinese'])),
  learning_language text check (learning_language = any (array['english', 'traditional-chinese'])),
  created_at timestamptz default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles (id),
  receiver_id uuid references public.profiles (id),
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid references public.profiles (id),
  user_two_id uuid references public.profiles (id),
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id),
  user_id uuid not null references auth.users (id),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz default now(),
  hidden_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id),
  sender_id uuid not null references auth.users (id),
  body text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  attachment_url text,
  attachment_type text,
  attachment_name text,
  shared_article jsonb
);

create table if not exists public.message_user_states (
  message_id bigint not null references public.messages (id),
  user_id uuid not null references auth.users (id),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.hidden_messages (
  user_id uuid not null references auth.users (id),
  message_id bigint not null references public.messages (id),
  hidden_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

-- The helper those tables' policies call, from the same reconstruction.
-- 20260910122000_lock_down_social_graph replaces it later with an empty
-- search_path; this is the shape the policies written before that expect.

create or replace function public.is_conversation_member(requested_conversation_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = requested_conversation_id
      and user_id = auth.uid()
  );
$function$;
