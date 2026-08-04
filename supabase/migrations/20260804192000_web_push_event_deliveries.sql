-- Prevent the same application event from producing duplicate Web Push
-- notifications when a client retries or React reruns an effect.

create table if not exists public.web_push_event_deliveries (
  event_kind text not null check (
    event_kind in (
      'message',
      'friend_request',
      'friend_accepted'
    )
  ),
  event_id text not null check (
    char_length(event_id) between 1 and 160
  ),
  recipient_user_id uuid not null
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (
    event_kind,
    event_id,
    recipient_user_id
  )
);

create index if not exists
  web_push_event_deliveries_recipient_created_idx
on public.web_push_event_deliveries (
  recipient_user_id,
  created_at desc
);

alter table public.web_push_event_deliveries
  enable row level security;

-- No anon/authenticated policies are intentionally created.
-- Only trusted server code using the service role may access this table.

revoke all
on table public.web_push_event_deliveries
from anon, authenticated;

grant select, insert, delete
on table public.web_push_event_deliveries
to service_role;

comment on table public.web_push_event_deliveries is
  'Server-only deduplication claims for application Web Push events.';
