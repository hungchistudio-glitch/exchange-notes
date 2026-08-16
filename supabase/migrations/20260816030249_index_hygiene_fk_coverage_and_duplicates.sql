-- Index hygiene: cover the foreign keys that carry the chat, drop exact duplicates.
--
-- From the performance advisor. Two separate problems, both cheap to fix and
-- neither one changing a query result.

-- ---------- Foreign keys with no covering index ----------
--
-- Postgres does not index a foreign key for you. Without one, a join or filter
-- on that column is a sequential scan, and every delete on the parent row has
-- to scan the child table to enforce the constraint.
--
-- messages_sender_id is the one that matters most: it is read on every render
-- of a thread, and get_total_unread_count filters on `m.sender_id != auth.uid()`
-- for every message it counts. The notifications ones back the same badge.

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

create index if not exists message_receipts_user_id_idx
  on public.message_receipts (user_id);

create index if not exists hidden_messages_message_id_idx
  on public.hidden_messages (message_id);

create index if not exists notifications_actor_id_idx
  on public.notifications (actor_id);

create index if not exists notifications_conversation_id_idx
  on public.notifications (conversation_id);

create index if not exists notifications_message_id_idx
  on public.notifications (message_id);

create index if not exists friend_requests_sender_id_idx
  on public.friend_requests (sender_id);

create index if not exists friend_requests_receiver_id_idx
  on public.friend_requests (receiver_id);

create index if not exists friendships_user_two_id_idx
  on public.friendships (user_two_id);

-- ---------- Byte-identical duplicate indexes ----------
--
-- vocabulary_items carried five indexes across two definitions. Duplicates are
-- not free: every insert and update maintains all of them, and the planner has
-- to consider each one.
--
--   (next_review_at)           vocabulary_items_next_review_at_idx   [in migrations]
--                              vocabulary_next_review_idx            [orphan]
--
--   (user_id, next_review_at)  vocabulary_items_user_next_review_at_idx [in migrations]
--                              vocabulary_items_next_review_idx      [orphan]
--                              vocabulary_items_review_queue_idx     [orphan]
--
-- The kept index of each pair is the one an actual migration creates. The three
-- dropped here appear in no migration and no branch — made in the SQL editor,
-- like the other strays this branch has been clearing out. Both column
-- signatures are kept, so nothing loses its access path.

drop index if exists public.vocabulary_next_review_idx;
drop index if exists public.vocabulary_items_next_review_idx;
drop index if exists public.vocabulary_items_review_queue_idx;
