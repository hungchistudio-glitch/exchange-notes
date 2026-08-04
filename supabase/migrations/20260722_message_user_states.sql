create table if not exists public.message_user_states (
  message_id bigint not null
    references public.messages(id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_user_states_user_hidden_idx
on public.message_user_states (user_id, hidden_at)
where hidden_at is not null;

create index if not exists message_user_states_message_idx
on public.message_user_states (message_id);

alter table public.message_user_states enable row level security;

drop policy if exists "Users can view their own message states"
on public.message_user_states;

create policy "Users can view their own message states"
on public.message_user_states
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own message states"
on public.message_user_states;

create policy "Users can create their own message states"
on public.message_user_states
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.messages m
    where m.id = message_id
      and public.is_conversation_member(m.conversation_id)
  )
);

drop policy if exists "Users can update their own message states"
on public.message_user_states;

create policy "Users can update their own message states"
on public.message_user_states
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own message states"
on public.message_user_states;

create policy "Users can delete their own message states"
on public.message_user_states
for delete
to authenticated
using (auth.uid() = user_id);
