-- Applied directly to production on 2026-09-09 and never written down. This
-- file is the statement recorded in supabase_migrations.schema_migrations for
-- version 20260909130734, so a database rebuilt from this directory arrives at
-- the same schema the live one has.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function private.dispatch_yumi_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select decrypted_secret
    into v_secret
    from vault.decrypted_secrets
   where name = 'yumi_reminders_cron_secret';

  if v_secret is null or pg_catalog.btrim(v_secret) = '' then
    raise warning
      'yumi_reminders_cron_secret is not in the vault; no reminder was requested.';
    return;
  end if;

  perform net.http_get(
    url := 'https://exchange-notes-app.vercel.app/api/cron/yumi-reminders',
    headers := pg_catalog.jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret
    ),
    timeout_milliseconds := 30000
  );
end;
$$;

comment on function private.dispatch_yumi_reminders() is
  'Asks the app to send whichever Yumi reminders are due this hour. Scheduled by pg_cron; reads its bearer token from the vault.';

revoke all on function private.dispatch_yumi_reminders() from public;
revoke all on function private.dispatch_yumi_reminders() from anon;
revoke all on function private.dispatch_yumi_reminders() from authenticated;

select cron.schedule(
  'yumi-reminders-hourly',
  '0 * * * *',
  $job$select private.dispatch_yumi_reminders()$job$
);
