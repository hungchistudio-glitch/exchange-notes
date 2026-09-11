-- Applied directly to production on 2026-09-09 and never written down. This
-- file is the statement recorded in supabase_migrations.schema_migrations for
-- version 20260909130947.

/*
 * pg_net belongs beside the other extensions, not in public.
 *
 * The migration before this one enabled it with a bare `create extension`,
 * which registers it against public — the database linter's
 * extension_in_public, and a finding that did not exist until then. Its
 * functions land in their own `net` schema either way, so nothing is exposed
 * through PostgREST and nothing referencing net.http_get has to change; this
 * is the extension's own bookkeeping namespace being wrong.
 *
 * pg_net is not relocatable, so `alter extension ... set schema` is not
 * available and it has to be dropped and recreated. Safe here and only here:
 * the queue is empty, nothing has been scheduled through it yet, and
 * private.dispatch_yumi_reminders references net.http_get from inside a
 * plpgsql body, which is resolved at call time rather than recorded as a
 * dependency.
 *
 * Guarded so a replay against a database that is already correct does not
 * drop a working extension out from under a live schedule.
 */
do $$
begin
  if exists (
    select 1
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
     where e.extname = 'pg_net'
       and n.nspname = 'public'
  ) then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end
$$;
