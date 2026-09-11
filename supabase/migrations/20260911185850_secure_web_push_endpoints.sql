-- A Web Push endpoint becomes an outbound request destination when a
-- notification is sent. Keep enabled subscriptions on browser-vendor hosts so
-- authenticated users cannot use either the API route or the directly
-- granted registration RPC as a blind SSRF primitive.

create or replace function public.is_trusted_web_push_endpoint(
  p_endpoint text
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select coalesce(
    trim(p_endpoint) ~* '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)(:443)?([/?#]|$)',
    false
  );
$function$;

update public.web_push_subscriptions
set
  enabled = false,
  updated_at = now()
where
  enabled = true
  and not public.is_trusted_web_push_endpoint(endpoint);

alter table public.web_push_subscriptions
  drop constraint if exists web_push_subscriptions_trusted_endpoint_check;

alter table public.web_push_subscriptions
  add constraint web_push_subscriptions_trusted_endpoint_check
  check (
    enabled = false
    or public.is_trusted_web_push_endpoint(endpoint)
  );

comment on constraint web_push_subscriptions_trusted_endpoint_check
on public.web_push_subscriptions is
  'Enabled subscriptions must target a recognized browser-vendor push service.';
