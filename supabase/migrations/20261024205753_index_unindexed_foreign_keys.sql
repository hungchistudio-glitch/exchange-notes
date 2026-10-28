-- The three foreign keys Supabase's advisor found without a covering index
-- (2026-10-24). Each is the column a cascade or a per-user read walks:
-- deleting a user cascades through user_id, deleting a news item through
-- item_id. Additive only.
create index if not exists yumi_review_rounds_user_id_idx
  on private.yumi_review_rounds (user_id);
create index if not exists daily_news_seen_item_id_idx
  on public.daily_news_seen (item_id);
create index if not exists message_language_analysis_user_id_idx
  on public.message_language_analysis (user_id);
