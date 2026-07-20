-- Add spaced-repetition fields to vocabulary items.

alter table public.vocabulary_items
  add column if not exists review_interval_days integer not null default 0,
  add column if not exists review_ease double precision not null default 2.5,
  add column if not exists review_repetitions integer not null default 0,
  add column if not exists review_count integer not null default 0,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists next_review_at timestamptz;

-- Prevent invalid review values.
alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_review_interval_days_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_review_interval_days_check
  check (review_interval_days >= 0);

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_review_ease_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_review_ease_check
  check (review_ease >= 1.3);

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_review_repetitions_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_review_repetitions_check
  check (review_repetitions >= 0);

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_review_count_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_review_count_check
  check (review_count >= 0);

-- Speed up the daily-review query.
create index if not exists vocabulary_items_next_review_at_idx
  on public.vocabulary_items (next_review_at);

create index if not exists vocabulary_items_user_next_review_at_idx
  on public.vocabulary_items (user_id, next_review_at);
