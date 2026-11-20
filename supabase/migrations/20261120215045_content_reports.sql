-- Readers' reports of something wrong (Chi, 2026-11-16: 回報問題).
--
-- A reader reports a wrong translation, reading or clue where they found
-- it (components/reports/ReportProblem.tsx); the app's owner reads them on
-- /reports. Only the server reads or writes this table, through the
-- service role (app/api/reports/route.ts): RLS is on with no policies and
-- the client roles hold no privileges, so no reader can read another's
-- note, or their own back.

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  surface text not null check (surface in ('word', 'news', 'game', 'lab')),
  item_key text not null check (char_length(item_key) between 1 and 200),
  language text check (language is null or char_length(language) <= 10),
  quoted text not null default '' check (char_length(quoted) <= 500),
  note text not null default '' check (char_length(note) <= 1000),
  page text not null default '' check (char_length(page) <= 300),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.content_reports is
  'Readers'' reports of a wrong word, reading or clue; server-only (app/api/reports/route.ts), read by the owner on /reports.';

-- The owner's list: open reports, newest first.
create index content_reports_open
  on public.content_reports (created_at desc)
  where resolved_at is null;

-- A reader's reports today, for the daily limit; also the user_id foreign key's index.
create index content_reports_user_recent
  on public.content_reports (user_id, created_at desc);

alter table public.content_reports enable row level security;

revoke all on public.content_reports from anon, authenticated;
