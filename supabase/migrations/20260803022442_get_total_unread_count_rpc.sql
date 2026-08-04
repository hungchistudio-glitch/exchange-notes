-- Single round-trip helper for the nav bar's unread badge, rather than
-- pulling every friend + membership + message client-side just to sum a
-- number. Mirrors the exact unread logic already in
-- lib/friends.ts#listConversationSummaries (skip hidden conversations,
-- count the other party's messages newer than my last_read_at).
create or replace function public.get_total_unread_count()
returns integer
language sql
stable security definer
set search_path to 'public'
as $$
  select coalesce(count(*), 0)::integer
  from public.messages m
  join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
   and cm.user_id = auth.uid()
  where m.sender_id != auth.uid()
    and cm.hidden_at is null
    and (cm.last_read_at is null or m.created_at > cm.last_read_at);
$$;
;
