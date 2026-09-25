-- Why a Gemini call failed, kept longer than an hour.
--
-- Vercel's Hobby plan keeps runtime logs for one hour, so every "the
-- dictionary could not be reached" a reader reported had already been
-- deleted by the time anyone looked. lib/ai/callLog.ts writes one row per
-- failed model call (and one per lookup served from the offline dictionary)
-- from the server, after the response has gone.
--
-- Nothing personal is stored: no user id, no prompt, no looked-up text. The
-- detail column is the model's own error message, cut to 400 characters.
-- Server-role access only: RLS is on and no policy grants anything.

create table if not exists public.ai_call_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  purpose text not null,
  model text not null,
  reason text not null
    check (reason in ('rate_limit', 'timeout', 'model_error', 'served_offline')),
  status integer,
  ms integer not null default 0,
  quota_metric text,
  detail text
);

comment on table public.ai_call_log is
  'Failed Gemini calls and offline-served lookups, for diagnosis. Server-role access only; no user data.';

create index if not exists ai_call_log_created_at_idx
  on public.ai_call_log (created_at desc);

alter table public.ai_call_log enable row level security;

revoke all on public.ai_call_log from anon, authenticated;
