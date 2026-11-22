-- Second half of narrowing the public directory (Chi, 2026-11-22: 收緊公開資料).
-- APPLY ONLY AFTER the deploy that reads strangers through
-- public.find_profile_by_exchange_id (20261122163138). Before it, the live
-- app's friend search and a hello's sender lookup read this view for
-- strangers and would find nobody. The version in this filename is
-- provisional: rename the file to the version the database records.
--
-- Until now the view showed every profile to anyone signed in. From here it
-- shows the reader's own people only, which is everything the app reads it
-- for (lib/friends.ts, lib/notes/repository.ts, components/hello/):
--   - the reader themself;
--   - friends;
--   - anyone a friend request has passed between, in either direction and
--     in any state (an incoming request names its sender);
--   - anyone the reader shares a conversation with, a former friend included
--     (a conversation outlives the friendship, 2026-10-24);
--   - anyone a note has been shared between, either way.
-- A stranger is reached only by exact Exchange ID, through the function.
--
-- Still security_invoker = false, as before: the view runs as its owner to
-- see past profiles' owner-only policy and the social tables' own policies,
-- and auth.uid() is still the caller's. Same six columns, so the grants and
-- every reader's select keep working.

create or replace view public.public_profiles
with (security_invoker = false) as
  select p.id, p.display_name, p.exchange_id, p.avatar_url, p.native_language, p.learning_language
  from public.profiles p
  where p.id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where (f.user_one_id = (select auth.uid()) and f.user_two_id = p.id)
         or (f.user_two_id = (select auth.uid()) and f.user_one_id = p.id)
    )
    or exists (
      select 1 from public.friend_requests r
      where (r.sender_id = (select auth.uid()) and r.receiver_id = p.id)
         or (r.receiver_id = (select auth.uid()) and r.sender_id = p.id)
    )
    or exists (
      select 1
      from public.conversation_members mine
      join public.conversation_members theirs on theirs.conversation_id = mine.conversation_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = p.id
    )
    or exists (
      select 1 from public.note_shares s
      where (s.recipient_id = (select auth.uid()) and s.owner_id = p.id)
         or (s.owner_id = (select auth.uid()) and s.recipient_id = p.id)
    );

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to authenticated;

comment on view public.public_profiles is
  'The public columns of the reader''s own people: themself, friends, request parties, conversation partners and note-share partners. A stranger is reached only by exact Exchange ID, through public.find_profile_by_exchange_id. Deliberately not security_invoker - that is what lets it see past the owner-only policy - so never add a column here that is not meant to be readable by those people.';
