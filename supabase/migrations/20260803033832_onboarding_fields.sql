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

update public.profiles
set onboarding_completed = true
where onboarding_completed = false;
;
