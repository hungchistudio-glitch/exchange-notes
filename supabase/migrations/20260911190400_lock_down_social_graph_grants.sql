-- Half two of two, after 20260911190150_lock_down_social_graph.
--
-- Apply this only once the deploy that routes every relationship mutation
-- through the functions in that migration is live. Applied before it, the
-- running browser code loses the INSERT/UPDATE/DELETE it still uses to send
-- a friend request, accept one, unfriend, or open a conversation — and every
-- one of those fails in front of the reader.
--
-- Nothing here is additive: it is exactly the set of privileges the previous
-- half made unnecessary.

-- Retain user-scoped reads, but remove all direct relationship construction.
drop policy if exists "Users can send requests" on public.friend_requests;
drop policy if exists "Users can update their own friend requests" on public.friend_requests;
drop policy if exists "Receiver can respond to a request" on public.friend_requests;
drop policy if exists "Sender or receiver can remove a request" on public.friend_requests;

drop policy if exists "Users can create friendships they're part of" on public.friendships;
drop policy if exists "Users can create a friendship they're part of" on public.friendships;
drop policy if exists "Users can delete friendships they're part of" on public.friendships;

drop policy if exists "Authenticated users can create conversations" on public.conversations;
drop policy if exists "Users can add members to conversations they're in" on public.conversation_members;
drop policy if exists "Users can update their own membership" on public.conversation_members;

drop policy if exists "Conversation members can create notifications for each other" on public.notifications;

revoke all privileges on table public.friend_requests from public, anon, authenticated;
grant select on table public.friend_requests to authenticated;

revoke all privileges on table public.friendships from public, anon, authenticated;
grant select on table public.friendships to authenticated;

revoke all privileges on table public.conversations from public, anon, authenticated;
grant select on table public.conversations to authenticated;

revoke all privileges on table public.conversation_members from public, anon, authenticated;
grant select on table public.conversation_members to authenticated;
grant update (last_read_at, hidden_at, muted_at)
  on table public.conversation_members to authenticated;

revoke update (conversation_id, user_id, joined_at)
  on table public.conversation_members from public, anon, authenticated;

revoke all privileges on table public.notifications from public, anon, authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
revoke update (user_id, type, actor_id, conversation_id, message_id, title, body, created_at)
  on table public.notifications from public, anon, authenticated;

-- Constraints are enforced for new rows immediately. NOT VALID avoids turning
-- the deployment into an unreviewed cleanup of historical production data.
alter table public.friend_requests
  add constraint friend_requests_shape_check
  check (
    sender_id is not null
    and receiver_id is not null
    and sender_id <> receiver_id
    and status is not null
    and status in ('pending', 'accepted', 'declined')
  ) not valid;

alter table public.friendships
  add constraint friendships_canonical_pair_check
  check (
    user_one_id is not null
    and user_two_id is not null
    and user_one_id < user_two_id
  ) not valid;

