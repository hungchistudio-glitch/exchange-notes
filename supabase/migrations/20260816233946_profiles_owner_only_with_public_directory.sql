-- Stop every signed-in user from reading every other user's profile row.
--
-- `Profiles are viewable by authenticated users` was USING (true). RLS is
-- row-level, and PostgREST lets the caller pick columns, so any signed-in
-- account could request `/rest/v1/profiles?select=email` and receive every
-- registered address. Measured before this migration, from an ordinary
-- account: 15 rows visible, 15 emails readable, 14 other users'
-- app_preferences readable.
--
-- Friend search reads six columns and no more (lib/friends.ts). Everything
-- else about a profile is only ever read for the signed-in user's own row. So
-- the two access patterns are separated: the table becomes owner-only, and the
-- six public columns move to a view that anyone signed in may read.

-- NOTE: this statement does nothing, and the next migration
-- (20260816234031_profiles_email_column_privilege_fix) is what actually keeps
-- email out of the API. A column-level revoke cannot subtract from the
-- table-level SELECT that `authenticated` already holds. Kept here so this
-- file still matches what was applied.
revoke select (email) on public.profiles from anon, authenticated;

drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;

do $$ begin
  create policy "Users can view own profile" on public.profiles
    for select to authenticated using (id = (select auth.uid()));
exception when duplicate_object then null; end $$;

-- security_invoker is off deliberately, and it is the whole mechanism: the
-- view runs as its owner so it can see past the owner-only policy above, and
-- what it returns is fixed at six columns, which a caller cannot widen the way
-- they could widen a select against the table. This is what lets a stranger
-- still be found by Exchange ID, which the invite flow depends on, without
-- that lookup also carrying their email.
--
-- Supabase's linter flags non-invoker views as `security_definer_view`. That is
-- expected here rather than an oversight.
create or replace view public.public_profiles
with (security_invoker = false) as
  select
    id,
    display_name,
    exchange_id,
    avatar_url,
    native_language,
    learning_language
  from public.profiles;

revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;

comment on view public.public_profiles is
  'The publicly visible columns of every profile. Exists because public.profiles is owner-only: friend search and Exchange ID lookup read this instead. Deliberately not security_invoker - that is what lets it see past the owner-only policy - so never add a column here that is not meant to be world-readable by signed-in users.';
