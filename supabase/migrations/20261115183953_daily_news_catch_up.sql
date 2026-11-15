-- The night's news, caught up every half hour (Chi, 2026-11-15: 排程後自動補跑).
--
-- One nightly run lost batches on most nights: the first model refusing with
-- 503, the second hanging to a 504, and the batch after it left no time to
-- start inside Vercel's sixty seconds. 4 to 11 cards a night against twelve,
-- and none on 2026-11-05. The cron route now asks only for what the night
-- still lacks (catchUpDailyNews, lib/news/refillPool.ts), so it can be
-- knocked on as often as is useful and a full night costs one count.
--
-- Vercel's Hobby plan allows one run a day per cron, so the half-hourly knock
-- comes from here, as Yumi's reminders do (20260909130734). Same bearer token:
-- both routes check the app's CRON_SECRET, which the vault already holds as
-- yumi_reminders_cron_secret.
--
-- Lands INACTIVE. The route only became safe to knock on repeatedly with the
-- deploy that brought catchUpDailyNews; before it, each knock would have made
-- a whole new night. It is switched on after that deploy is live:
--   select cron.alter_job((select jobid from cron.job where jobname = 'daily-news-catch-up'), active := true);

create or replace function private.dispatch_daily_news()
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
      'yumi_reminders_cron_secret is not in the vault; no news catch-up was requested.';
    return;
  end if;

  /*
   * Fire-and-forget, as the reminders' knock is. A run takes up to its sixty
   * seconds; the reply lands in net._http_response, where a status other than
   * 200 is the thing to look for.
   */
  perform net.http_get(
    url := 'https://exchange-notes-app.vercel.app/api/cron/daily-news',
    headers := pg_catalog.jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret
    ),
    timeout_milliseconds := 65000
  );
end;
$$;

comment on function private.dispatch_daily_news() is
  'Asks the app to catch up on the night''s daily news. Scheduled by pg_cron every half hour from 20:00 to 23:30 UTC; reads its bearer token from the vault.';

revoke all on function private.dispatch_daily_news() from public;
revoke all on function private.dispatch_daily_news() from anon;
revoke all on function private.dispatch_daily_news() from authenticated;

-- Every half hour, 20:00 to 23:30 UTC: eight chances before Taiwan's morning.
-- cron.schedule upserts on the name, so this can run again safely.
select cron.schedule(
  'daily-news-catch-up',
  '*/30 20-23 * * *',
  $job$select private.dispatch_daily_news()$job$
);

select cron.alter_job(
  (select jobid from cron.job where jobname = 'daily-news-catch-up'),
  active := false
);
