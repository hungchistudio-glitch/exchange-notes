-- Settings that follow the account rather than the device.
--
-- Font size, interface language, the daily word goal and the speech settings
-- all lived in localStorage only. That makes them a property of a browser
-- rather than of a person: signing in somewhere else — or losing local
-- storage, which Safari does evict — silently returned everyone to the
-- defaults, and on a shared device one person's choices applied to the next
-- person to sign in.
--
-- interface_mode and learning_language were already account-backed columns.
-- This is the same idea for the rest, as one document instead of a column per
-- setting: they are read and written together, always for the current user,
-- and never queried across users.

alter table public.profiles
  add column if not exists app_preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.app_preferences is
  'Per-account UI preferences (font size, interface language, daily word goal, speech settings). Written by the client on change; localStorage remains the fast local copy.';
