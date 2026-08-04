-- Phase 1 of the notification system brief: schema for in-app notifications,
-- message delivery/read receipts, per-conversation mute, and notification
-- preferences (quiet hours / privacy preview level). Deliberately does NOT
-- include anything push/FCM-specific beyond a device_tokens table shaped to
-- be ready for it later.

alter table public.conversation_members
  add column if not exists muted_at timestamptz;

create table if not exists public.message_receipts (
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id)
);

alter table public.message_receipts enable row level security;

do $$ begin
  create policy "Members can view receipts in their conversations" on public.message_receipts
    for select to authenticated using (
      exists (
        select 1 from public.messages m
        where m.id = message_receipts.message_id
          and is_conversation_member(m.conversation_id)
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can create their own receipt" on public.message_receipts
    for insert to authenticated with check (
      user_id = auth.uid()
      and exists (
        select 1 from public.messages m
        where m.id = message_receipts.message_id
          and is_conversation_member(m.conversation_id)
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own receipt" on public.message_receipts
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  type text not null check (type in (
    'message', 'friend_request', 'friend_accepted', 'word_saved'
  )),
  actor_id uuid references public.profiles (id),
  conversation_id uuid references public.conversations (id) on delete cascade,
  message_id bigint references public.messages (id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

do $$ begin
  create policy "Users can view their own notifications" on public.notifications
    for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own notifications" on public.notifications
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own notifications" on public.notifications
    for delete to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Conversation members can create notifications for each other" on public.notifications
    for insert to authenticated with check (
      actor_id is null or actor_id = auth.uid()
    );
exception when duplicate_object then null; end $$;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id),
  notification_level text not null default 'all' check (
    notification_level in ('all', 'important', 'badge_only', 'none')
  ),
  privacy_preview text not null default 'full' check (
    privacy_preview in ('full', 'sender_only', 'hidden')
  ),
  sound_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

do $$ begin
  create policy "Users can view their own notification preferences" on public.notification_preferences
    for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can upsert their own notification preferences" on public.notification_preferences
    for insert to authenticated with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own notification preferences" on public.notification_preferences
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  platform text not null check (platform in ('ios', 'android', 'web')),
  token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

do $$ begin
  create policy "Users can view their own device tokens" on public.device_tokens
    for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can register their own device tokens" on public.device_tokens
    for insert to authenticated with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own device tokens" on public.device_tokens
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own device tokens" on public.device_tokens
    for delete to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
;
