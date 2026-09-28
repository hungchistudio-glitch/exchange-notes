-- Two more kinds of row in the failure log (2026-09-28):
--   google_down — every model was already known to be away, so the reader
--                 was told "Google's AI is unavailable" at once, unasked;
--   on_device   — a report from the phone's own camera recogniser, so a
--                 camera that shows nothing on an iPhone can be diagnosed.
alter table public.ai_call_log drop constraint if exists ai_call_log_reason_check;
alter table public.ai_call_log add constraint ai_call_log_reason_check
  check (reason in ('rate_limit', 'timeout', 'model_error', 'served_offline', 'google_down', 'on_device'));
