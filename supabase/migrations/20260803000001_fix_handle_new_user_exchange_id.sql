-- Fixes "Database error saving new user" for every Google OAuth sign-up.
--
-- Root cause: handle_new_user() inserted exchange_id as
-- lower(coalesce(new.raw_user_meta_data ->> 'exchange_id', '')). Google
-- OAuth never provides an `exchange_id` claim (only the manual email
-- signup form sets it), so this always evaluated to '' for Google
-- sign-ins — which fails profiles_exchange_id_format
-- (CHECK exchange_id ~ '^[a-z0-9_]{3,24}$'), the trigger throws, and the
-- whole auth.users insert rolls back.
--
-- Fix: fall back to a deterministic, guaranteed-unique, guaranteed-valid
-- handle derived from the user's own uuid ("user_" + first 19 hex chars,
-- 24 chars total — exactly the format's max length) whenever metadata
-- doesn't supply one. Users can still change it later from Settings
-- (existing exchange-id-availability flow already supports that).
--
-- Also: the ON CONFLICT DO UPDATE branch no longer overwrites exchange_id
-- on re-auth, so a user's chosen handle is never silently reset back to
-- the fallback (or to stale OAuth metadata) on a later sign-in.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  fallback_exchange_id text;
begin
  fallback_exchange_id := 'user_' || substr(replace(new.id::text, '-', ''), 1, 19);

  insert into public.profiles (id, display_name, exchange_id, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    lower(coalesce(nullif(new.raw_user_meta_data ->> 'exchange_id', ''), fallback_exchange_id)),
    new.email
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      email = excluded.email;

  return new;
end;
$function$;
