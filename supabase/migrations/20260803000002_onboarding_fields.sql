-- First-time onboarding flow tracking.
--
-- onboarding_completed defaults to false so every NEW row (created by the
-- handle_new_user trigger on signup) starts unonboarded. Existing accounts
-- are backfilled to true immediately below, so nobody who already uses the
-- app gets funneled into onboarding retroactively.
--
-- onboarding_step is a lightweight resume pointer covering only the two
-- steps that persist required data (name, languages) — the welcome and
-- app-language screens have nothing of their own to resume (app language
-- is an instant client-side preference, not stored here at all).

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  add column if not exists onboarding_step text;

do $$
begin
  alter table public.profiles
    add constraint profiles_onboarding_step_check
    check (onboarding_step is null or onboarding_step in ('name', 'languages'));
exception
  when duplicate_object then null;
end $$;

-- Backfill: every account that exists right now has already been using
-- the app without this flow, so treat them as already onboarded.
update public.profiles
set onboarding_completed = true
where onboarding_completed = false;
