-- A 503 "high demand" is now remembered for 45 seconds as "busy"
-- (lib/ai/modelHealth.ts), so every feature skips a model that just said it
-- is full instead of asking it again on every request (2026-09-28).
alter table public.ai_model_health drop constraint if exists ai_model_health_reason_check;
alter table public.ai_model_health add constraint ai_model_health_reason_check
  check (reason in ('timeout', 'rate_limit', 'daily_quota', 'busy'));
