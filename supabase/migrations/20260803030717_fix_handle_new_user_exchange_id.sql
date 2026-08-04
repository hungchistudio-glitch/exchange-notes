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
;
