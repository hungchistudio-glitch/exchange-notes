-- The insert policy on message_language_analysis compares a column to itself.
--
-- 20260817140000 wrote the membership check as:
--
--   exists (
--     select 1 from public.messages m
--     where m.id = message_id and m.conversation_id = conversation_id
--   )
--
-- Neither column on the right is qualified. Postgres resolves an unqualified
-- name against the innermost scope first, and `messages` has a
-- `conversation_id`, so that half bound to `m.conversation_id` and became
-- `m.conversation_id = m.conversation_id` — true for every row. `message_id`
-- escaped the same fate only because `messages` has no column of that name,
-- so it fell through to the outer table as intended. One line, one binding
-- right and one wrong.
--
-- What it allows: a signed-in reader can insert an analysis row for *any*
-- message id, including messages in conversations they cannot see, as long as
-- they name a conversation they are a member of. It is not a read: the select
-- policy is still `user_id = auth.uid()`, so nobody gains sight of anyone
-- else's content. What they gain is the ability to write rows of their own
-- that point at messages they have no access to.
--
-- The fix is the qualification that was meant: the message's own conversation
-- is what has to be checked, which is exactly what the sibling policy on
-- detected_phrases already does.
--
-- Every policy on both tables is also re-stated with `(select auth.uid())`.
-- 20260816030329 did that for seventy-one policies; these seven were written
-- the day after and never got it.

drop policy if exists "Users can create their own analysis"
  on public.message_language_analysis;
create policy "Users can create their own analysis"
  on public.message_language_analysis
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.is_conversation_member(conversation_id)
    and exists (
      select 1
      from public.messages m
      where m.id = message_language_analysis.message_id
        and m.conversation_id = message_language_analysis.conversation_id
    )
  );

drop policy if exists "Users can view their own analysis"
  on public.message_language_analysis;
create policy "Users can view their own analysis"
  on public.message_language_analysis
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own analysis"
  on public.message_language_analysis;
create policy "Users can update their own analysis"
  on public.message_language_analysis
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own analysis"
  on public.message_language_analysis;
create policy "Users can delete their own analysis"
  on public.message_language_analysis
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own detected phrases"
  on public.detected_phrases;
create policy "Users can create their own detected phrases"
  on public.detected_phrases
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.messages m
      where m.id = detected_phrases.message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "Users can view their own detected phrases"
  on public.detected_phrases;
create policy "Users can view their own detected phrases"
  on public.detected_phrases
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own detected phrases"
  on public.detected_phrases;
create policy "Users can delete their own detected phrases"
  on public.detected_phrases
  for delete to authenticated
  using ((select auth.uid()) = user_id);
