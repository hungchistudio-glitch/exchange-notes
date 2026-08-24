-- The Pronunciation Lab's own storage.
--
-- pronunciation_practice_state, which this supersedes, could only count how
-- many times a sound had been replayed, and its unit_kind column admitted
-- exactly two values: 'english' and 'zhuyin'. Neither the shape nor the
-- allowlist survives contact with five languages, and neither can hold what
-- the Lab now needs to know — whether an attempt was right, what was
-- measured about it, and when the sound is due again.
--
-- Three tables, in the order they are written to:
--
--   pronunciation_attempts   append-only, one row per attempt
--   pronunciation_progress   the current state of one unit, upserted
--   pronunciation_sessions   one row per finished training session
--
-- The progress table is derivable from the attempts table, and is stored
-- anyway: every screen in the Lab opens by reading progress for the whole
-- language, and re-aggregating a year of attempts to draw a landing page is
-- a cost paid on every visit to save one that is paid on every answer.
--
-- Language is stored as a BCP-47 code under the same allowlist as
-- profiles.learning_language, so the two can be compared directly rather
-- than through a translation.
--
-- APPLIED 2026-08-22, before the branch that reads these tables deployed.
-- That order is the opposite of 20260822184940's and both are right: that
-- one rewrote a column live code was comparing against, so it had to wait
-- for readers that accepted either encoding. This one only adds tables
-- nothing existing touches, so running it first simply means the Lab has
-- somewhere to write from its first request instead of showing its
-- "couldn't load your progress" state until the DB caught up.
--
-- All 93 rows of pronunciation_practice_state carried over.

/* =========================================================
   Progress
   ========================================================= */

create table if not exists public.pronunciation_progress (
  user_id uuid not null references auth.users(id) on delete cascade,

  language text not null
    check (language = any (array['en', 'zh-TW', 'es', 'fr', 'it'])),

  -- The unit, lesson or minimal pair this row is about. Lessons and pairs
  -- are namespaced by their writer ('lesson:', 'pair:') so all three share
  -- one key space without a second column to join on — see
  -- lib/pronunciation/lab/progress.ts.
  unit_id text not null,

  -- 0-100, and null where nothing has measured it. Null is load-bearing:
  -- the app renders it as "not analyzed" rather than as a zero, and the
  -- whole scoring design turns on never inventing a number.
  listening_score integer check (listening_score between 0 and 100),
  speaking_score integer check (speaking_score between 0 and 100),
  accuracy_score integer check (accuracy_score between 0 and 100),

  attempts integer not null default 0 check (attempts >= 0),
  correct_attempts integer not null default 0 check (correct_attempts >= 0),

  mastery text not null default 'new'
    check (mastery = any (array['new', 'learning', 'improving', 'mastered'])),

  last_practiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, language, unit_id),

  -- A unit cannot have been right more often than it was attempted. Cheap to
  -- check, and the one inconsistency that would quietly corrupt every
  -- mastery and weakness calculation downstream.
  constraint pronunciation_progress_correct_within_attempts
    check (correct_attempts <= attempts)
);

-- Every screen loads one language's progress at once, and the primary key's
-- leading columns already serve that. This index is for the reverse question
-- the review module asks: what is due, oldest first.
create index if not exists pronunciation_progress_due_idx
  on public.pronunciation_progress (user_id, language, last_practiced_at asc);

alter table public.pronunciation_progress enable row level security;

create policy "Users read their own pronunciation progress"
  on public.pronunciation_progress
  for select
  using ((select auth.uid()) = user_id);

create policy "Users insert their own pronunciation progress"
  on public.pronunciation_progress
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users update their own pronunciation progress"
  on public.pronunciation_progress
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own pronunciation progress"
  on public.pronunciation_progress
  for delete
  using ((select auth.uid()) = user_id);

/* =========================================================
   Attempts

   The history the weakness map is aggregated from, and the audit trail
   behind every number the Lab shows. No audio is stored here, or anywhere
   else: a recording exists as an object URL inside the tab that made it and
   is revoked when the screen is done with it.
   ========================================================= */

create table if not exists public.pronunciation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  language text not null
    check (language = any (array['en', 'zh-TW', 'es', 'fr', 'it'])),

  unit_id text not null,

  -- Which module the attempt came from, so "I keep failing this in Listen
  -- but not in Speak" is answerable later.
  module text not null
    check (module = any (array['sounds', 'listen', 'speak', 'words', 'rhythm', 'review'])),

  outcome text not null
    check (outcome = any (array['correct', 'almost', 'incorrect', 'skipped'])),

  -- Null wherever the attempt was not measured — a listening answer is
  -- right or wrong without being a percentage, and a spoken attempt on a
  -- device with no recogniser has no score at all.
  score integer check (score between 0 and 100),

  -- Which analyzer produced `score`, so a future backend's numbers are
  -- distinguishable from this one's rather than being silently averaged
  -- together with them.
  analyzer text,

  created_at timestamptz not null default now()
);

create index if not exists pronunciation_attempts_user_language_idx
  on public.pronunciation_attempts (user_id, language, created_at desc);

create index if not exists pronunciation_attempts_unit_idx
  on public.pronunciation_attempts (user_id, language, unit_id, created_at desc);

alter table public.pronunciation_attempts enable row level security;

create policy "Users read their own pronunciation attempts"
  on public.pronunciation_attempts
  for select
  using ((select auth.uid()) = user_id);

create policy "Users record their own pronunciation attempts"
  on public.pronunciation_attempts
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own pronunciation attempts"
  on public.pronunciation_attempts
  for delete
  using ((select auth.uid()) = user_id);

-- Deliberately no update policy. An attempt is a record of something that
-- happened; correcting it after the fact would make the history a worse
-- source than the aggregate it feeds.

/* =========================================================
   Sessions
   ========================================================= */

create table if not exists public.pronunciation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  language text not null
    check (language = any (array['en', 'zh-TW', 'es', 'fr', 'it'])),

  item_count integer not null default 0 check (item_count >= 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),

  -- Null when nothing in the session was measured, which is the ordinary
  -- case on a device without a recogniser.
  average_score integer check (average_score between 0 and 100),

  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists pronunciation_sessions_user_idx
  on public.pronunciation_sessions (user_id, language, started_at desc);

alter table public.pronunciation_sessions enable row level security;

create policy "Users read their own pronunciation sessions"
  on public.pronunciation_sessions
  for select
  using ((select auth.uid()) = user_id);

create policy "Users create their own pronunciation sessions"
  on public.pronunciation_sessions
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users update their own pronunciation sessions"
  on public.pronunciation_sessions
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own pronunciation sessions"
  on public.pronunciation_sessions
  for delete
  using ((select auth.uid()) = user_id);

/* =========================================================
   Carrying the old table forward

   pronunciation_practice_state recorded replay counts against the two unit
   kinds the Lab used to have. A replay is not an attempt — nobody was ever
   judged right or wrong — so it cannot become one without inventing a
   result. What it can honestly become is what it always was: evidence that
   this sound has been practised, and when.

   So the rows arrive with attempts and correct_attempts at zero and mastery
   at 'new', carrying only last_practiced_at. Nothing is fabricated, and the
   Lab's "recently practised" list is populated on day one instead of
   pretending a returning user has never opened it.

   The unit ids are rewritten to the new namespaced ones ('a' -> 'letter-a',
   'b' -> 'zhuyin-b'); the old ids were per-kind and would collide across
   languages in a single key space.

   The old table is left in place, unread and unwritten. Dropping it is the
   one step here that a re-run could not undo, and it can go in a later
   migration once this has been serving in production.
   ========================================================= */

insert into public.pronunciation_progress (
  user_id, language, unit_id, attempts, correct_attempts, mastery,
  last_practiced_at, created_at, updated_at
)
select
  state.user_id,
  case state.unit_kind when 'english' then 'en' else 'zh-TW' end,
  case state.unit_kind
    when 'english' then 'letter-' || state.unit_id
    else 'zhuyin-' || state.unit_id
  end,
  0,
  0,
  'new',
  state.last_practiced_at,
  coalesce(state.created_at, now()),
  now()
from public.pronunciation_practice_state as state
where state.unit_kind in ('english', 'zhuyin')
on conflict (user_id, language, unit_id) do nothing;

comment on table public.pronunciation_progress is
  'Per-language, per-unit pronunciation mastery. Supersedes pronunciation_practice_state.';

comment on table public.pronunciation_attempts is
  'Append-only history of pronunciation attempts. No audio is stored, here or anywhere.';
