-- The nav bar's unread badge subscribes to UPDATEs on conversation_members
-- to learn when a conversation has been read, but the table was never added
-- to the realtime publication — only friend_requests and messages were. The
-- subscription therefore never fired: the badge counted up on every incoming
-- message and had no way back down, so the unread dot never cleared.
--
-- The reading tab now also signals locally (lib/messages/unreadSignal.ts), so
-- this is what makes a read on one device clear the badge on another.
--
-- RLS is enabled on the table with four policies, and Realtime applies them
-- to postgres_changes, so subscribers still only receive rows they are
-- allowed to select.

alter publication supabase_realtime add table public.conversation_members;
