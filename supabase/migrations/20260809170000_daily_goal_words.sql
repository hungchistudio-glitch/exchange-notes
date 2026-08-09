-- Give the daily goal somewhere the server can read it.
--
-- The setting has existed in Settings for a long time and has never done
-- anything: it was written to localStorage and nothing read it back. The
-- vocabulary hero and Yumi's goal-completed state both used a hard-coded 10 in
-- hooks/useVocabularyStats.ts, and the reminder cron — which runs on the
-- server — had no way to see a browser's localStorage at all, so Yumi could
-- never mention the goal she was reminding people about.
--
-- The unit changes with this column. Settings said minutes ("30 minutes")
-- while every number the app actually computes is a count of words added
-- today, so the two could never be compared. Words is the unit that matches
-- what is measured, what the pet is fed, and what the app tells new users to
-- aim for.
--
-- Defaulting to 10 keeps the number every existing account has been shown.

alter table public.profiles
  add column if not exists daily_goal_words smallint not null default 10;

alter table public.profiles
  drop constraint if exists profiles_daily_goal_words_allowed;

-- Constrained rather than free-form: Settings offers five choices, and a value
-- outside them would render as a progress bar that can never fill.
alter table public.profiles
  add constraint profiles_daily_goal_words_allowed
  check (daily_goal_words in (5, 10, 15, 20, 33));

comment on column public.profiles.daily_goal_words is
  'Words the user aims to add per day. Read by the Yumi reminder cron and by the vocabulary hero.';
