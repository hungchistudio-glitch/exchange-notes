-- Drop redundant permissive policies: one rule per table per command.
--
-- Permissive policies are OR'd, so every extra one on the same command is
-- another expression Postgres evaluates per row, and the effective rule is
-- always the loosest of them. These tables had accumulated two policies for
-- the same command — in most cases the same rule written twice, once in a
-- migration and once by hand in the SQL editor under a slightly different
-- name. There are no restrictive policies anywhere in this schema, so nothing
-- below interacts with an AND.
--
-- The kept policy is the one an actual migration creates. Everything dropped
-- here is either byte-identical to what remains, or strictly contained by it,
-- with one deliberate exception called out below.

-- ---------- vocabulary_collections ----------
--
-- `Users manage own collections` is FOR ALL with `auth.uid() = user_id` as
-- both USING and WITH CHECK, which is exactly what these four spelled out one
-- command at a time using the same expression. Dropping them changes nothing:
-- FOR ALL applies USING to select/update/delete and WITH CHECK to
-- insert/update, which is the same coverage these four provided.

drop policy if exists "Users can view their own collections" on public.vocabulary_collections;
drop policy if exists "Users can create their own collections" on public.vocabulary_collections;
drop policy if exists "Users can update their own collections" on public.vocabulary_collections;
drop policy if exists "Users can delete their own collections" on public.vocabulary_collections;

-- ---------- vocabulary_collection_items ----------
--
-- The select and delete pairs are byte-identical, so these two are no-ops.

drop policy if exists "Users can view their own collection items" on public.vocabulary_collection_items;
drop policy if exists "Users can remove from their own collections" on public.vocabulary_collection_items;

-- The insert pair is not identical, and this is the one real behaviour change
-- in this migration.
--
--   kept    `Users add own collection items`
--           the collection is yours AND the vocabulary item is yours
--   dropped `Users can add to their own collections`
--           the collection is yours
--
-- Because permissive policies are OR'd, the looser one has been the effective
-- rule and the item-ownership half has never applied: any signed-in user could
-- attach someone else's vocabulary_item_id to their own collection. Little
-- came of it — reading the word itself still goes through vocabulary_items,
-- whose own policy is owner-only — but it is not what the migration intended.
--
-- Safe to tighten: lib/vocabulary/collections.ts#addItemToCollection is the
-- only insert path, and the ids it passes come from the user's own vocabulary
-- list, which is already owner-scoped by RLS.

drop policy if exists "Users can add to their own collections" on public.vocabulary_collection_items;

-- ---------- friendships ----------
--
-- Same rule as the surviving policy with the operands the other way round
-- (`auth.uid() = user_one_id` vs `user_one_id = auth.uid()`).

drop policy if exists "Users can view their friendships" on public.friendships;
drop policy if exists "Users can create a friendship they're part of" on public.friendships;

-- ---------- friend_requests ----------
--
-- Both of these are in migrations, but `receiver_id = auth.uid()` is strictly
-- contained by `auth.uid() = sender_id OR auth.uid() = receiver_id`, so OR-ing
-- them is the broader one alone. Dropping the narrower changes nothing.

drop policy if exists "Receiver can respond to a request" on public.friend_requests;

-- ---------- profiles ----------
--
-- `Profiles are viewable by authenticated users` is USING (true), which
-- subsumes the owner-only select. Dropping the narrower one is a no-op.
--
-- Worth knowing rather than acting on here: what remains means any signed-in
-- user can read every profile row. That is what the app already does — it is
-- how exchange_id lookup and friend search find people — and it was already
-- the effective behaviour before this migration.

drop policy if exists "Users can view own profile" on public.profiles;

-- ---------- conversation_members ----------
--
-- Two update policies with the identical expression, differing only in scope:
-- one applies to PUBLIC, the other to `authenticated`. Keeping the
-- authenticated-scoped one is the tighter of the two and loses nothing — an
-- anon caller could never satisfy `auth.uid() = user_id` anyway, since
-- auth.uid() is null for them.

drop policy if exists "Users can update their own membership" on public.conversation_members;
