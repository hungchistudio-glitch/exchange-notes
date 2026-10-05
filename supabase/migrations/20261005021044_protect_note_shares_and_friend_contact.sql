-- Updating a share must prove ownership of the resulting note as well.
-- Revocation remains possible after a friendship has ended.
alter policy "Owners update note shares" on public.note_shares
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.notes n
      where n.id = note_shares.note_id and n.user_id = (select auth.uid())
    )
    and (revoked_at is not null or exists (
      select 1 from public.friendships f
      where (f.user_one_id = owner_id and f.user_two_id = recipient_id)
         or (f.user_two_id = owner_id and f.user_one_id = recipient_id)
    ))
  );

-- Defend reads too, including any old malformed share. This existing private
-- helper avoids recursive notes -> shares -> notes RLS evaluation.
create or replace function private.has_active_note_share(checked_note_id uuid, reader_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select reader_id = (select auth.uid()) and exists (
    select 1 from public.note_shares s
    join public.notes n on n.id = s.note_id and n.user_id = s.owner_id
    join public.friendships f
      on (f.user_one_id = s.owner_id and f.user_two_id = s.recipient_id)
      or (f.user_two_id = s.owner_id and f.user_one_id = s.recipient_id)
    where s.note_id = checked_note_id and s.recipient_id = reader_id
      and s.revoked_at is null
  );
$$;
revoke all on function private.has_active_note_share(uuid, uuid) from public, anon;
grant execute on function private.has_active_note_share(uuid, uuid) to authenticated;

-- Old memberships retain readable history; only current friends may send.
alter policy "Members can send messages" on public.messages
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
    and exists (
      select 1 from public.conversation_members peer
      join public.friendships f
        on (f.user_one_id = (select auth.uid()) and f.user_two_id = peer.user_id)
        or (f.user_two_id = (select auth.uid()) and f.user_one_id = peer.user_id)
      where peer.conversation_id = messages.conversation_id
        and peer.user_id <> (select auth.uid())
    )
  );

create or replace function public.remove_friend(p_friend_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $function$
declare
  v_actor uuid := (select auth.uid());
  v_removed integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_friend_id is null or p_friend_id = v_actor then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'social-pair:' || least(v_actor::text, p_friend_id::text) || ':' || greatest(v_actor::text, p_friend_id::text), 0));
  delete from public.friendships
  where (user_one_id = v_actor and user_two_id = p_friend_id)
     or (user_two_id = v_actor and user_one_id = p_friend_id);
  get diagnostics v_removed = row_count;
  -- Re-friending must not silently re-enable old private-note shares.
  update public.note_shares set revoked_at = now()
  where revoked_at is null and (
    (owner_id = v_actor and recipient_id = p_friend_id)
    or (owner_id = p_friend_id and recipient_id = v_actor));
  return v_removed > 0;
end;
$function$;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;
