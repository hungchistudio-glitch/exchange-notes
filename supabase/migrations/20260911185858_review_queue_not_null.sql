-- New vocabulary belongs in the due queue immediately. Set the default
-- before the backfill so a concurrent insert cannot create another NULL in
-- the window before NOT NULL is applied.

alter table public.vocabulary_items
  alter column next_review_at set default now();

update public.vocabulary_items
set next_review_at = coalesce(created_at, now())
where next_review_at is null;

alter table public.vocabulary_items
  alter column next_review_at set not null;
