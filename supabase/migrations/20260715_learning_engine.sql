alter table public.vocabulary_items
  add column if not exists next_review_at timestamptz,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists review_count integer not null default 0,
  add column if not exists ease_factor numeric(4,2) not null default 2.50,
  add column if not exists interval_days integer not null default 0;

update public.vocabulary_items
set next_review_at = coalesce(next_review_at, created_at, now())
where next_review_at is null;

alter table public.vocabulary_items
  alter column next_review_at set default now();

create index if not exists vocabulary_items_review_queue_idx
  on public.vocabulary_items (user_id, next_review_at);

alter table public.vocabulary_items
  add constraint vocabulary_items_review_count_nonnegative
  check (review_count >= 0) not valid;

alter table public.vocabulary_items
  validate constraint vocabulary_items_review_count_nonnegative;

alter table public.vocabulary_items
  add constraint vocabulary_items_interval_days_nonnegative
  check (interval_days >= 0) not valid;

alter table public.vocabulary_items
  validate constraint vocabulary_items_interval_days_nonnegative;

alter table public.vocabulary_items
  add constraint vocabulary_items_ease_factor_range
  check (ease_factor >= 1.30 and ease_factor <= 4.00) not valid;

alter table public.vocabulary_items
  validate constraint vocabulary_items_ease_factor_range;
