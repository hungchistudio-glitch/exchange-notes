-- The copy of vocabulary examples made by hand on 2026-08-31, before the
-- examples were reshaped. Nothing reads it: the only references are the
-- account-deletion and hello functions, which delete a leaving user's rows
-- from it only if it exists (to_regclass), so they keep working without it.
-- Dropped at Chi's request on 2026-10-24. On its own, as a destructive
-- statement belongs (supabase/migrations/README.md).
drop table if exists public.vocabulary_examples_backup_20260831;
