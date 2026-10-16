-- =========================================================
-- An account can be deleted, by the reader it belongs to, completely
--
-- Settings now has "Delete account": the server removes the reader's files
-- through the Storage API, then deletes the auth user with the service role,
-- and everything else the reader owns goes with it by ON DELETE CASCADE.
--
-- Four tables were created (20260803022322_notifications_system) with plain
-- references to auth.users, so deleting any reader who had ever received a
-- message, saved notification preferences or registered an APNs token
-- failed outright on a foreign key — from the dashboard as much as from the
-- app. On 2026-10-15 that was 206 receipts and 11 preference rows in
-- production, which is to say most readers could not be deleted at all.
-- They cascade now, and so does a notification about something a deleted
-- reader did: the message it pointed at is gone with them.
--
-- Files are not reachable from SQL — Storage refuses direct deletes from
-- storage.objects, and removing the row would leave the file behind anyway —
-- so this adds the one query the server needs to find them, executable by
-- service_role alone. It also clears the reader's rows from a hand-made
-- backup table outside this chain (see supabase/migrations/README.md),
-- which holds vocabulary examples by user_id with no foreign key: without
-- this they would outlive the account they came from.
-- =========================================================

alter table public.device_tokens
  drop constraint if exists device_tokens_user_id_fkey,
  add constraint device_tokens_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.message_receipts
  drop constraint if exists message_receipts_user_id_fkey,
  add constraint message_receipts_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.notification_preferences
  drop constraint if exists notification_preferences_user_id_fkey,
  add constraint notification_preferences_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.notifications
  drop constraint if exists notifications_user_id_fkey,
  add constraint notifications_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.notifications
  drop constraint if exists notifications_actor_id_fkey,
  add constraint notifications_actor_id_fkey
    foreign key (actor_id) references public.profiles (id) on delete cascade;

-- ---------- what the server has to remove before the auth user ----------

create or replace function public.prepare_account_deletion(p_user_id uuid)
returns table (bucket_id text, object_name text)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- The caller is service_role, so there is no auth.uid() to fall back on
  -- and a missing id must not quietly match nothing or everything.
  if p_user_id is null then
    raise exception 'A user id is required' using errcode = '22023';
  end if;

  -- Made by hand and outside this chain, so it may not exist everywhere.
  if to_regclass('public.vocabulary_examples_backup_20260831') is not null then
    execute 'delete from public.vocabulary_examples_backup_20260831 where user_id = $1'
      using p_user_id;
  end if;

  -- Every file is uploaded by its reader's own session, so owner_id names
  -- them; the folder is checked too for the two buckets keyed by user, in
  -- case a file ever arrives there through the service role, ownerless.
  return query
    select o.bucket_id, o.name
      from storage.objects o
     where o.owner_id = p_user_id::text
        or (
          o.bucket_id in ('avatars', 'vocabulary-images')
          and split_part(o.name, '/', 1) = p_user_id::text
        );
end;
$function$;

-- A bare CREATE FUNCTION grants EXECUTE to PUBLIC; the browser must never
-- reach this through /rest/v1/rpc.
revoke all on function public.prepare_account_deletion(uuid)
  from public, anon, authenticated;

grant execute on function public.prepare_account_deletion(uuid)
  to service_role;

comment on function public.prepare_account_deletion(uuid) is
  'Server-only step of account deletion: clears rows no foreign key reaches and lists the reader''s storage objects for removal through the Storage API.';
