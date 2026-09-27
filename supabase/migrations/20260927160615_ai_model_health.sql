-- Which Gemini models to leave alone, shared by every server instance.
--
-- A model that hangs or has spent its daily free-tier quota used to be put
-- away in a Map inside one serverless instance. Vercel starts new instances
-- constantly, and each of them learned the same lesson again the slow way:
-- on 2026-09-27 a French lookup waited 13.5s for gemini-3.6-flash to answer
-- DEADLINE_EXCEEDED before trying the model that then answered in 1s.
--
-- lib/ai/modelHealth.ts writes a row here when a model times out or refuses
-- on quota, and every instance reads the table (cached for a few seconds)
-- before choosing whom to ask. Server-role access only.

create table if not exists public.ai_model_health (
  model text primary key,
  unavailable_until timestamptz not null,
  reason text not null
    check (reason in ('timeout', 'rate_limit', 'daily_quota')),
  updated_at timestamptz not null default now()
);

comment on table public.ai_model_health is
  'Gemini models to skip until a time, shared across server instances. Server-role access only.';

alter table public.ai_model_health enable row level security;

revoke all on public.ai_model_health from anon, authenticated;
