-- The RLS policies this directory has always assumed and never created.
--
-- 20260816030329 wraps `auth.uid()` in a sub-select across 71 policies, and
-- `alter policy` raises 42704 against one that is not there. Sixteen of the
-- seventy-one were created in the dashboard and never written down, so a
-- replay from empty stops on the first of them.
--
-- They are created here, immediately before that pass, rather than in the
-- table baseline: three of these tables do not exist until 20260717030000 and
-- 20260802000002, both of which come later than that file.
--
-- Two groups, and the distinction matters for how exact these have to be:
--
--   Seven survive to this day — the vocabulary_items and yumi_pet_state
--   owner policies. These are reproduced from production's own pg_policies,
--   command for command.
--
--   Nine are dropped six minutes later by
--   20260816030944_drop_redundant_permissive_policies, which consolidates
--   them. Their historical text is not recorded anywhere, so they are written
--   in the shape 20260816030329 says they had — that file spells out each
--   one's final expression, which is the same expression with the sub-select
--   already applied. Since they are dropped before anything else reads them,
--   the end state does not depend on getting their prose exactly right.
--
-- Every policy is dropped first, so this is a no-op against production and
-- against any database built from the chain since.

-- ---------- vocabulary_items: still in force today ----------

drop policy if exists "Users can view own vocabulary" on public.vocabulary_items;
create policy "Users can view own vocabulary" on public.vocabulary_items
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own vocabulary" on public.vocabulary_items;
create policy "Users can insert own vocabulary" on public.vocabulary_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own vocabulary" on public.vocabulary_items;
create policy "Users can update own vocabulary" on public.vocabulary_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own vocabulary" on public.vocabulary_items;
create policy "Users can delete own vocabulary" on public.vocabulary_items
  for delete using (auth.uid() = user_id);

-- ---------- yumi_pet_state: still in force today ----------

drop policy if exists "Users can read their own pet state" on public.yumi_pet_state;
create policy "Users can read their own pet state" on public.yumi_pet_state
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pet state" on public.yumi_pet_state;
create policy "Users can insert their own pet state" on public.yumi_pet_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pet state" on public.yumi_pet_state;
create policy "Users can update their own pet state" on public.yumi_pet_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- dropped by 20260816030944, present only for the pass ----------

drop policy if exists "Users can view their friendships" on public.friendships;
create policy "Users can view their friendships" on public.friendships
  for select using (auth.uid() = user_one_id or auth.uid() = user_two_id);

drop policy if exists "Users can create a friendship they're part of" on public.friendships;
create policy "Users can create a friendship they're part of" on public.friendships
  for insert with check (user_one_id = auth.uid() or user_two_id = auth.uid());

drop policy if exists "Users can view their own collections" on public.vocabulary_collections;
create policy "Users can view their own collections" on public.vocabulary_collections
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create their own collections" on public.vocabulary_collections;
create policy "Users can create their own collections" on public.vocabulary_collections
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own collections" on public.vocabulary_collections;
create policy "Users can update their own collections" on public.vocabulary_collections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own collections" on public.vocabulary_collections;
create policy "Users can delete their own collections" on public.vocabulary_collections
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can view their own collection items" on public.vocabulary_collection_items;
create policy "Users can view their own collection items" on public.vocabulary_collection_items
  for select using (
    exists (
      select 1 from public.vocabulary_collections c
      where c.id = vocabulary_collection_items.collection_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can add to their own collections" on public.vocabulary_collection_items;
create policy "Users can add to their own collections" on public.vocabulary_collection_items
  for insert with check (
    exists (
      select 1 from public.vocabulary_collections c
      where c.id = vocabulary_collection_items.collection_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can remove from their own collections" on public.vocabulary_collection_items;
create policy "Users can remove from their own collections" on public.vocabulary_collection_items
  for delete using (
    exists (
      select 1 from public.vocabulary_collections c
      where c.id = vocabulary_collection_items.collection_id
        and c.user_id = auth.uid()
    )
  );
