-- First half of narrowing the public directory (Chi, 2026-11-22: 收緊公開資料).
--
-- public.public_profiles shows six columns of every profile to anyone signed
-- in, so one account could list every reader's name, Exchange ID, avatar and
-- languages. The only stranger the app ever needs is one whose exact Exchange
-- ID the reader already has: an invite link, a hello's sender, a search for
-- an ID, or "is this ID taken?" while choosing one. This function answers
-- exactly that, one row or none.
--
-- It also ends a quieter leak: lib/friends.ts searched with ilike, where `_`
-- and `%` are wildcards, so "a%" found the first ID starting with "a" and an
-- underscore matched any character. Here the match is equality, after the same
-- trimming and lower-casing the app does (IDs are ^[a-z0-9_]{3,24}$).
--
-- Additive: nothing the live code reads changes. The second half, which
-- restricts the view to the reader's own people, is applied after the deploy
-- that switches the app to this function.

create or replace function public.find_profile_by_exchange_id(p_exchange_id text)
returns table (
  id uuid,
  display_name text,
  exchange_id text,
  avatar_url text,
  native_language text,
  learning_language text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.exchange_id, p.avatar_url, p.native_language, p.learning_language
  from public.profiles p
  where (select auth.uid()) is not null
    and p.exchange_id = pg_catalog.lower(pg_catalog.ltrim(pg_catalog.btrim(coalesce(p_exchange_id, '')), '@'))
  limit 1;
$$;

revoke all on function public.find_profile_by_exchange_id(text) from public, anon;
grant execute on function public.find_profile_by_exchange_id(text) to authenticated;

comment on function public.find_profile_by_exchange_id(text) is
  'One profile''s six public columns by its exact Exchange ID, or nothing. The only way the app reaches a stranger; public_profiles shows the reader''s own people.';
