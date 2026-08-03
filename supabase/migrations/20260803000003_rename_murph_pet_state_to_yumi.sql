-- The Logo Pet is being renamed from "Murph" to "Yumi" across the whole
-- app (see lib/pet/repository.ts, components/vocabulary/pet/*,
-- components/home/yumi/*). This migration renames the underlying table to
-- match — a plain rename, not a recreate, so every existing user's data
-- (fed cookies, cookie totals, last-fed/last-opened timestamps) is
-- preserved exactly as-is. Postgres carries row-level security policies
-- and the primary key/foreign key across a table rename automatically, so
-- nothing else needs to change.
alter table if exists public.murph_pet_state rename to yumi_pet_state;
