-- Baseline snapshot of tables that already exist on the live database but
-- were never captured in a tracked migration (profiles, conversations,
-- conversation_members, messages, friend_requests, friendships,
-- message_user_states, hidden_messages, and the is_conversation_member()
-- helper). Reconstructed by reading the live schema directly via the
-- Supabase MCP on 2026-08-02 — every column, constraint, and RLS policy
-- below matches production exactly.
--
-- Every statement is written to be safe to run against a database that
-- already has these objects (IF NOT EXISTS / duplicate_object guards), so
-- running it against the live project is a harmless no-op.

-- ---------- profiles ----------

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

alter table public.profiles enable row level security;

do $$ begin
  create policy "Profiles are viewable by authenticated users" on public.profiles
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert own profile" on public.profiles
    for insert to authenticated with check (id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own profile" on public.profiles
    for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can view own profile" on public.profiles
    for select to authenticated using (id = auth.uid());
exception when duplicate_object then null; end $$;

-- ---------- friend_requests / friendships ----------

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles (id),
  receiver_id uuid references public.profiles (id),
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.friend_requests enable row level security;

do $$ begin
  create policy "Users can send requests" on public.friend_requests
    for insert with check (sender_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can view their own requests" on public.friend_requests
    for select using (sender_id = auth.uid() or receiver_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own friend requests" on public.friend_requests
    for update using (auth.uid() = sender_id or auth.uid() = receiver_id)
    with check (auth.uid() = sender_id or auth.uid() = receiver_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Receiver can respond to a request" on public.friend_requests
    for update using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Sender or receiver can remove a request" on public.friend_requests
    for delete using (sender_id = auth.uid() or receiver_id = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid references public.profiles (id),
  user_two_id uuid references public.profiles (id),
  created_at timestamptz default now()
);

alter table public.friendships enable row level security;

do $$ begin
  create policy "Users can view their own friendships" on public.friendships
    for select using (user_one_id = auth.uid() or user_two_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can create friendships they're part of" on public.friendships
    for insert with check (auth.uid() = user_one_id or auth.uid() = user_two_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete friendships they're part of" on public.friendships
    for delete to authenticated using (auth.uid() = user_one_id or auth.uid() = user_two_id);
exception when duplicate_object then null; end $$;

-- ---------- conversations / conversation_members ----------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id),
  user_id uuid not null references auth.users (id),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz default now(),
  hidden_at timestamptz,
  primary key (conversation_id, user_id)
);

alter table public.conversation_members enable row level security;

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

do $$ begin
  create policy "Members can view conversations" on public.conversations
    for select to authenticated using (is_conversation_member(id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated users can create conversations" on public.conversations
    for insert with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can view memberships" on public.conversation_members
    for select to authenticated using (is_conversation_member(conversation_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can add members to conversations they're in" on public.conversation_members
    for insert with check (user_id = auth.uid() or is_conversation_member(conversation_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own membership" on public.conversation_members
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own read state" on public.conversation_members
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ---------- messages ----------

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

alter table public.messages enable row level security;

do $$ begin
  create policy "Members can view messages" on public.messages
    for select to authenticated using (is_conversation_member(conversation_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Members can send messages" on public.messages
    for insert to authenticated with check (sender_id = auth.uid() and is_conversation_member(conversation_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete own messages" on public.messages
    for delete to authenticated using (auth.uid() = sender_id);
exception when duplicate_object then null; end $$;

-- ---------- message_user_states / hidden_messages ----------

create table if not exists public.message_user_states (
  message_id bigint not null references public.messages (id),
  user_id uuid not null references auth.users (id),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_user_states enable row level security;

do $$ begin
  create policy "Users can view their own message states" on public.message_user_states
    for select to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can create their own message states" on public.message_user_states
    for insert to authenticated with check (
      auth.uid() = user_id
      and exists (
        select 1 from public.messages m
        where m.id = message_user_states.message_id
          and is_conversation_member(m.conversation_id)
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own message states" on public.message_user_states
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own message states" on public.message_user_states
    for delete to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create table if not exists public.hidden_messages (
  user_id uuid not null references auth.users (id),
  message_id bigint not null references public.messages (id),
  hidden_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

alter table public.hidden_messages enable row level security;

do $$ begin
  create policy "Users can view their own hidden messages" on public.hidden_messages
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can hide messages for themselves" on public.hidden_messages
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
;
