-- Social-graph writes used to be assembled in the browser under permissive
-- RLS. Besides allowing request/acceptance spoofing, that left accepted
-- requests, friendships and conversation memberships half-written whenever a
-- later request failed. Keep reads under RLS, but make every relationship
-- mutation one authenticated, serialized database transaction.

create or replace function public.is_conversation_member(
  requested_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = requested_conversation_id
      and user_id = (select auth.uid())
  );
$function$;

create or replace function public.get_or_create_direct_conversation(
  p_friend_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_conversation_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_friend_id is null or p_friend_id = v_actor then
    raise exception 'A different friend is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'social-pair:'
        || least(v_actor::text, p_friend_id::text)
        || ':'
        || greatest(v_actor::text, p_friend_id::text),
      0
    )
  );

  if not exists (
    select 1
    from public.friendships
    where (
      user_one_id = v_actor and user_two_id = p_friend_id
    ) or (
      user_one_id = p_friend_id and user_two_id = v_actor
    )
  ) then
    raise exception 'An accepted friendship is required' using errcode = '42501';
  end if;

  select mine.conversation_id
  into v_conversation_id
  from public.conversation_members as mine
  join public.conversation_members as friend_member
    on friend_member.conversation_id = mine.conversation_id
   and friend_member.user_id = p_friend_id
  where mine.user_id = v_actor
    and not exists (
      select 1
      from public.conversation_members as extra
      where extra.conversation_id = mine.conversation_id
        and extra.user_id <> all (array[v_actor, p_friend_id])
    )
  order by mine.joined_at asc
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations default values
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_conversation_id, v_actor),
    (v_conversation_id, p_friend_id);

  return v_conversation_id;
end;
$function$;

create or replace function public.send_friend_request(
  p_receiver_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_receiver_id is null then
    raise exception 'A receiver is required' using errcode = '22023';
  end if;

  if p_receiver_id = v_actor then
    return 'self';
  end if;

  if not exists (select 1 from public.profiles where id = p_receiver_id) then
    raise exception 'Profile not found' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'social-pair:'
        || least(v_actor::text, p_receiver_id::text)
        || ':'
        || greatest(v_actor::text, p_receiver_id::text),
      0
    )
  );

  if exists (
    select 1
    from public.friendships
    where (
      user_one_id = v_actor and user_two_id = p_receiver_id
    ) or (
      user_one_id = p_receiver_id and user_two_id = v_actor
    )
  ) then
    return 'already-friends';
  end if;

  if exists (
    select 1
    from public.friend_requests
    where status = 'pending'
      and (
        (sender_id = v_actor and receiver_id = p_receiver_id)
        or (sender_id = p_receiver_id and receiver_id = v_actor)
      )
  ) then
    return 'already-pending';
  end if;

  delete from public.friend_requests
  where status <> 'pending'
    and (
      (sender_id = v_actor and receiver_id = p_receiver_id)
      or (sender_id = p_receiver_id and receiver_id = v_actor)
    );

  insert into public.friend_requests (sender_id, receiver_id, status)
  values (v_actor, p_receiver_id, 'pending');

  return 'sent';
end;
$function$;

create or replace function public.respond_to_friend_request(
  p_request_id uuid,
  p_response text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_sender uuid;
  v_receiver uuid;
  v_conversation_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_response not in ('accepted', 'declined') then
    raise exception 'Response must be accepted or declined' using errcode = '22023';
  end if;

  select sender_id, receiver_id
  into v_sender, v_receiver
  from public.friend_requests
  where id = p_request_id;

  if not found or v_receiver <> v_actor then
    raise exception 'Pending friend request not found' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'social-pair:'
        || least(v_actor::text, v_sender::text)
        || ':'
        || greatest(v_actor::text, v_sender::text),
      0
    )
  );

  select sender_id, receiver_id
  into v_sender, v_receiver
  from public.friend_requests
  where id = p_request_id
    and receiver_id = v_actor
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending friend request not found' using errcode = '42501';
  end if;

  update public.friend_requests
  set status = p_response
  where id = p_request_id;

  if p_response = 'declined' then
    return null;
  end if;

  insert into public.friendships (user_one_id, user_two_id)
  select least(v_actor, v_sender), greatest(v_actor, v_sender)
  where not exists (
    select 1
    from public.friendships
    where (
      user_one_id = v_actor and user_two_id = v_sender
    ) or (
      user_one_id = v_sender and user_two_id = v_actor
    )
  )
  on conflict (user_one_id, user_two_id) do nothing;

  v_conversation_id :=
    public.get_or_create_direct_conversation(v_sender);

  return v_conversation_id;
end;
$function$;

create or replace function public.remove_friend(
  p_friend_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_removed integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_friend_id is null or p_friend_id = v_actor then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'social-pair:'
        || least(v_actor::text, p_friend_id::text)
        || ':'
        || greatest(v_actor::text, p_friend_id::text),
      0
    )
  );

  delete from public.friendships
  where (
    user_one_id = v_actor and user_two_id = p_friend_id
  ) or (
    user_one_id = p_friend_id and user_two_id = v_actor
  );

  get diagnostics v_removed = row_count;
  return v_removed > 0;
end;
$function$;

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

revoke all on function public.is_conversation_member(uuid)
  from public, anon, authenticated;
grant execute on function public.is_conversation_member(uuid)
  to authenticated;

revoke all on function public.send_friend_request(uuid)
  from public, anon, authenticated;
grant execute on function public.send_friend_request(uuid)
  to authenticated;

revoke all on function public.respond_to_friend_request(uuid, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_friend_request(uuid, text)
  to authenticated;

revoke all on function public.get_or_create_direct_conversation(uuid)
  from public, anon, authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid)
  to authenticated;

revoke all on function public.remove_friend(uuid)
  from public, anon, authenticated;
grant execute on function public.remove_friend(uuid)
  to authenticated;

-- This existing trigger is SECURITY DEFINER. Its body already qualifies the
-- relation, so remove the writable `public` schema from name resolution too.
alter function public.unhide_conversation_on_new_message()
  set search_path = '';
