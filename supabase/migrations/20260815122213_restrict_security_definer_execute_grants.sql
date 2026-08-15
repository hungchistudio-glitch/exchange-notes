-- Take SECURITY DEFINER functions off the REST API where nothing calls them.
--
-- Supabase's default privileges grant EXECUTE on every new public-schema
-- function directly to anon and authenticated, which publishes it at
-- /rest/v1/rpc/<name>. A direct role grant survives a revoke aimed at the
-- PUBLIC pseudo-role, so each role has to be named explicitly.
--
-- Nothing here changes a function body or a policy; only who may call what.

-- ---------- handle_new_user ----------
--
-- A trigger function on auth.users: it creates the profile row and assigns the
-- exchange_id. It was never meant to be callable directly, and a caller who
-- reached it over REST would run it as the definer.
--
-- Revoking EXECUTE does not disturb the trigger. PostgreSQL checks EXECUTE on
-- a trigger function at CREATE TRIGGER time; ExecCallTriggerFunc does not
-- re-check it when the trigger fires. Verified against postgres:16 — with the
-- ACL reduced to the owner alone, an insert still fired the trigger and wrote
-- the row, while a direct call from anon failed with "permission denied".

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

-- ---------- is_conversation_member ----------
--
-- An RLS helper used by the policies on conversations, conversation_members,
-- messages, message_user_states, and message_receipts.
--
-- This one keeps its authenticated grant, and deliberately so. Unlike a
-- trigger, an RLS policy expression is evaluated as the calling role at
-- runtime and init_fcache checks EXECUTE on every function in it. Revoking
-- from authenticated turns every read of a conversation into
-- "ERROR: permission denied for function is_conversation_member" — the
-- messaging tables become unreadable rather than better protected.
--
-- Revoking anon is safe and is the part worth having: every policy that reads
-- this helper is `to authenticated`, except the conversation_members insert
-- policy, where an anon caller is rejected either way (auth.uid() is null, so
-- the helper could only ever return false). What this removes is the ability
-- for an unauthenticated caller to probe conversation membership over REST.

revoke all on function public.is_conversation_member(uuid) from public;
revoke all on function public.is_conversation_member(uuid) from anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- ---------- Web Push subscription RPCs ----------
--
-- These stay callable by authenticated: app/api/push/subscription/route.ts
-- calls both through a user-scoped client, and each derives its user from
-- auth.uid() rather than trusting a caller-supplied id.
--
-- Their original migrations revoked from PUBLIC only, which leaves Supabase's
-- direct anon grant in place. Name anon so an unauthenticated caller cannot
-- register or delete a push endpoint. PUBLIC is repeated here rather than
-- assumed: anon inherits a surviving PUBLIC grant no matter what the anon
-- revoke says, and both statements are idempotent.

revoke all on function public.register_web_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
) from public, anon;

grant execute on function public.register_web_push_subscription(
  text,
  text,
  text,
  bigint,
  text,
  text
) to authenticated;

revoke all on function public.unregister_web_push_subscription(text)
  from public, anon;

grant execute on function public.unregister_web_push_subscription(text)
  to authenticated;

-- ---------- get_total_unread_count ----------
--
-- The nav bar's unread badge. It counts strictly from auth.uid(), so an anon
-- caller can only ever get 0 back — the grant buys nothing and publishes one
-- more SECURITY DEFINER function at /rest/v1/rpc. authenticated keeps it:
-- lib/friends.ts calls it on every nav render.

revoke all on function public.get_total_unread_count() from public, anon;
grant execute on function public.get_total_unread_count() to authenticated;

comment on function public.handle_new_user() is
  'Trigger function for auth.users inserts. Not callable over the REST API: EXECUTE is revoked from anon, authenticated, and PUBLIC. Triggers do not check EXECUTE when they fire.';

comment on function public.is_conversation_member(uuid) is
  'RLS helper for the messaging tables. authenticated must retain EXECUTE — policy expressions are evaluated as the calling role, so revoking it breaks every read of conversations and messages.';
