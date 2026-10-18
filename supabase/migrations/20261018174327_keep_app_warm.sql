-- Keeping the app's server warm, so opening it does not wait for one to boot.
--
-- Measured 2026-10-18 on production: the first request after the server has
-- been idle took 1.78s to answer, the next ones 0.17-0.19s. The difference is
-- Vercel starting a function instance. On a phone that is the white screen
-- between tapping the icon and seeing anything at all, and it is paid again
-- on every open that follows a quiet spell, which for an app with a handful
-- of readers is most of them.
--
-- A request every five minutes keeps an instance alive between real ones
-- (Chi approved the five-minute knock, 2026-10-18). /home is the address the
-- installed app opens on, and a signed-out request to it runs the proxy and
-- the protected layout before redirecting to /login, so the knock warms the
-- same code a cold open needs.
--
-- About 8,600 knocks a month, each a redirect from /home and the login page
-- it leads to.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function private.keep_app_warm()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  /*
   * Fire-and-forget, as with the reminders: pg_net queues this and returns.
   * No credentials and no cookies, so the app sees a signed-out visitor and
   * answers with its redirect to /login, which pg_net follows — so each knock
   * also renders the login page, the other half of a signed-out cold open.
   */
  perform net.http_get(
    url := 'https://exchange-notes-app.vercel.app/home',
    headers := pg_catalog.jsonb_build_object(
      'User-Agent', 'exchange-notes-keep-warm'
    ),
    timeout_milliseconds := 10000
  );

  /*
   * pg_cron keeps a row per run and never deletes them. Every five minutes is
   * 288 a day, so this job tidies up its own history and leaves every other
   * job's alone.
   */
  delete from cron.job_run_details
   where jobid in (select jobid from cron.job where jobname = 'keep-app-warm')
     and end_time < pg_catalog.now() - interval '1 day';
end;
$$;

comment on function private.keep_app_warm() is
  'Requests /home so a Vercel instance stays warm between real visits. Scheduled every five minutes by pg_cron.';

revoke all on function private.keep_app_warm() from public;
revoke all on function private.keep_app_warm() from anon;
revoke all on function private.keep_app_warm() from authenticated;

-- cron.schedule upserts on the job name, so running this again replaces it.
select cron.schedule(
  'keep-app-warm',
  '*/5 * * * *',
  $job$select private.keep_app_warm()$job$
);
