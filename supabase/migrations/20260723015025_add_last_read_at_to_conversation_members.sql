-- ============================================================
-- Conversation Members
-- Add unread tracking foundation
-- ============================================================

alter table public.conversation_members
add column if not exists last_read_at timestamptz;

update public.conversation_members
set last_read_at = now()
where last_read_at is null;

alter table public.conversation_members
alter column last_read_at set default now();

create index if not exists conversation_members_last_read_idx
on public.conversation_members (
  user_id,
  conversation_id,
  last_read_at
);

comment on column public.conversation_members.last_read_at
is 'Latest time this user has read the conversation.';

drop policy if exists "Users can update their own read state"
on public.conversation_members;

create policy "Users can update their own read state"
on public.conversation_members
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
