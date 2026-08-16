-- Actually keep email out of the client API.
--
-- The previous migration used `revoke select (email) ... from authenticated`,
-- which is a no-op against a role that holds table-wide SELECT: in PostgreSQL
-- a table-level grant covers every column, and a column-level revoke cannot
-- subtract from it. Verified after applying it — an authenticated session
-- could still read profiles.email.
--
-- The working form is the other way round: drop the table-wide grant, then
-- grant back the columns individually, leaving email out. The owner-only row
-- policy still applies on top, so this only governs which columns are legible
-- at all, for any row.
--
-- One consequence worth knowing: `select *` against profiles now fails for the
-- client, because the star expands to include a column it may not read. No
-- caller does that today — every read names its columns — but a new one must
-- name them too.

revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  exchange_id,
  display_name,
  avatar_url,
  native_language,
  learning_language,
  created_at,
  onboarding_completed,
  onboarding_step,
  interface_mode,
  app_preferences
) on public.profiles to authenticated;

comment on column public.profiles.email is
  'Written by handle_new_user on sign-up. SELECT is not granted to anon or authenticated, so it cannot be read through the client API for any row, including your own - the profile screen shows the address from the auth session instead. Server code that needs it uses the service role.';
