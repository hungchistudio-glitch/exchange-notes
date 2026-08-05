-- Yumi Web Push reminders.
--
-- The server currently has reliable access to Yumi feeding/open timestamps,
-- but daily study minutes still live only in browser localStorage.
-- Therefore this first reminder version is based on whether Yumi has been
-- fed during the user's current local day.

alter table public.notification_preferences
  add column if not exists
    yumi_reminders_enabled boolean not null default false,
  add column if not exists
    time_zone text not null default 'America/New_York';

do $$
begin
  alter table public.notification_preferences
    add constraint notification_preferences_time_zone_length_check
    check (char_length(time_zone) between 1 and 100);
exception
  when duplicate_object then null;
end
$$;

create table if not exists
  public.yumi_reminder_deliveries (
    user_id uuid not null
      references auth.users(id) on delete cascade,
    local_date date not null,
    claimed_at timestamptz not null default now(),
    delivered_at timestamptz,

    primary key (user_id, local_date)
  );

create index if not exists
  yumi_reminder_deliveries_claimed_at_idx
on public.yumi_reminder_deliveries (
  claimed_at desc
);

alter table public.yumi_reminder_deliveries
  enable row level security;

-- This is a server-only delivery claim table.
revoke all
on table public.yumi_reminder_deliveries
from anon, authenticated;

grant select, insert, update, delete
on table public.yumi_reminder_deliveries
to service_role;

comment on column
  public.notification_preferences.yumi_reminders_enabled
is
  'Whether Yumi may send one daily Web Push reminder when not fed.';

comment on column
  public.notification_preferences.time_zone
is
  'IANA timezone used for Yumi local-day and quiet-hours calculations.';

comment on table public.yumi_reminder_deliveries is
  'Server-only daily deduplication claims for Yumi Web Push reminders.';
