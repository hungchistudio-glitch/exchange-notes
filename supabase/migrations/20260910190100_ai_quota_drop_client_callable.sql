-- =========================================================
-- Remove the AI quota functions a browser could still call
--
-- The second half of 20260910190000, split out so the two can be applied
-- either side of a deploy. That file added consume/refund in a form that
-- takes the user id and is granted to service_role alone; this one removes
-- the auth.uid() forms that any signed-in reader could reach at
-- /rest/v1/rpc/ and use to refund their own allowance in a loop.
--
-- Apply this only after the deploy that switches every caller to the
-- three-argument form. Applied before it, the running code loses the
-- functions it calls and every route silently falls back to the
-- per-instance in-memory counter — which is not a limit worth having.
--
-- There is no down migration. Restoring these would restore the hole.
-- =========================================================

drop function if exists public.consume_ai_daily_quota(text, integer);
drop function if exists public.refund_ai_daily_quota(text);
