alter table public.vocabulary_items
  add column if not exists next_review_at timestamptz,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists review_interval numeric not null default 0,
  add column if not exists review_ease numeric not null default 2.5,
  add column if not exists review_count integer not null default 0,
  add column if not exists correct_count integer not null default 0;
update public.vocabulary_items
set next_review_at = coalesce(next_review_at, created_at, now())
where next_review_at is null;
create index if not exists vocabulary_items_user_review_due_idx
  on public.vocabulary_items (user_id, next_review_at asc);
