-- Yumi's reminder, on a schedule that actually keeps to it.
--
-- The reminder is due at eight in the evening where the reader is, which is a
-- four-hour window per timezone and therefore needs an hourly knock. Vercel's
-- Hobby plan triggers a cron once a day and allows two, both already spoken
-- for, so the hourly trigger was a scheduled GitHub Actions workflow.
--
-- GitHub does not honour it. Measured across the first two days:
--
--   09-07 17:00, 20:58, 23:19
--   09-08 02:28, 07:39, 12:29, 16:58, 19:45, 22:15
--   09-09 00:57, 05:43, 10:33
--
-- Every 2.5 to 5 hours — four or five a day rather than twenty-four. Nothing
-- is broken; GitHub deprioritises high-frequency schedules on public
-- repositories and says so. But against a four-hour window it makes delivery
-- a coin toss for every timezone except the one Vercel's daily cron happens
-- to land on, which is currently America/New_York and only by accident.
--
-- pg_cron runs in this database and keeps to its schedule. The route is
-- unchanged: it still decides who is due, and yumi_reminder_deliveries still
-- holds each reader to one reminder per local day, so more knocks cost
-- nothing and a duplicate is reported as a duplicate.

-- Both create their own schemas — cron and net — and neither is relocatable,
-- so no `with schema` clause here.
create extension if not exists pg_cron;
create extension if not exists pg_net;

/*
 * The knock itself.
 *
 * Deliberately thin. Everything about who is due, what hour it is for them,
 * quiet hours and deduplication lives in the route, and a second copy of any
 * of that here would be a second place to keep it correct.
 *
 * The bearer token comes from the vault rather than from this file, which is
 * committed, and rather than from a database setting, which is readable by
 * anyone who can reach the server. Nothing here ever prints it.
 */
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

  /*
   * Warns and stops rather than sending an unauthenticated request that the
   * route would answer 401 anyway. This is the state the migration lands in:
   * the schedule exists and does nothing until the secret is put in the
   * vault, which is a person's job and not a migration's.
   */
  if v_secret is null or pg_catalog.btrim(v_secret) = '' then
    raise warning
      'yumi_reminders_cron_secret is not in the vault; no reminder was requested.';
    return;
  end if;

  /*
   * pg_net is fire-and-forget: this queues the request and returns, so a
   * route that takes most of its sixty seconds does not hold a cron slot
   * open. The reply lands in net._http_response, which pg_net expires on its
   * own; nothing here reads it, because the route's own summary in the Vercel
   * logs is the record worth having.
   */
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

-- Nobody reaches this but the scheduler. It is security definer and it holds
-- a decrypted secret for the length of one call.
revoke all on function private.dispatch_yumi_reminders() from public;
revoke all on function private.dispatch_yumi_reminders() from anon;
revoke all on function private.dispatch_yumi_reminders() from authenticated;

/*
 * Hourly, on the hour. cron.schedule upserts on the job name, so running this
 * migration again replaces the schedule rather than adding a second one.
 *
 * The hour itself does not matter — the route compares against each reader's
 * own clock, and this only has to come round often enough not to miss a
 * four-hour window.
 */
select cron.schedule(
  'yumi-reminders-hourly',
  '0 * * * *',
  $job$select private.dispatch_yumi_reminders()$job$
);
