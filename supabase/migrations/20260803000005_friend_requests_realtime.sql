-- Friend requests were already correctly written and readable by their
-- receiver under RLS, but the table was never added to the
-- supabase_realtime publication — so nothing client-side could ever be
-- notified live when one arrived (only `messages` was in the publication).
-- This is what let an incoming friend request sit completely unnoticed:
-- the only way to see it was to manually open /friends, and nothing
-- anywhere prompted a receiver to do that.
--
-- Adds friend_requests to the realtime publication so
-- useIncomingFriendRequestCount (hooks/friends/useIncomingFriendRequestCount.ts)
-- can subscribe to INSERT/UPDATE and keep its badge live, the same way
-- useUnreadMessageCount already does for messages.

alter publication supabase_realtime add table public.friend_requests;
