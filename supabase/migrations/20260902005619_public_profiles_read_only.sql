-- public_profiles is a directory. It must not also be a way to edit the
-- directory.
--
-- profiles is owner-only under RLS, and this view exists to let a signed-in
-- reader look up the handful of fields you need to find and name a partner —
-- display name, exchange id, avatar, languages. Email is deliberately not in
-- it. That part was right.
--
-- What was wrong is that the view is auto-updatable (a plain SELECT of one
-- table, so Postgres will happily write through it) and `authenticated` held
-- INSERT, UPDATE and DELETE on it. Because the view runs with its owner's
-- privileges rather than the caller's, RLS on profiles does not apply to a
-- write that arrives this way — so any signed-in user could rewrite or
-- delete any other user's profile row through
-- PATCH /rest/v1/public_profiles.
--
-- The original migration only ever granted SELECT. The write grants came
-- from Supabase's default privileges on new objects in the public schema,
-- and `revoke all ... from public, anon` does not touch a direct grant to
-- `authenticated`.
--
-- That is the same trap already written up in 20260808024242 for functions,
-- where anon kept an EXECUTE grant that a revoke aimed at PUBLIC had missed.
-- It is worth naming twice: revoking from PUBLIC is not revoking from the
-- roles Supabase grants to by name.

revoke insert, update, delete, truncate, references, trigger
  on public.public_profiles from authenticated;

-- Restated rather than assumed, so this migration leaves the view in a known
-- state instead of a state that depends on what ran before it.
revoke all on public.public_profiles from public, anon;
grant select on public.public_profiles to authenticated;

comment on view public.public_profiles is
  'Read-only directory of the fields needed to find and name a partner. '
  'Never writable: profiles is owner-only, and this view bypasses that RLS.';
