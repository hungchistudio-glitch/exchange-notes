-- Which interface shell the account prefers: the standard experience, or the
-- Yumi Command Deck.
--
-- Stored on the profile rather than only in the browser so the choice follows
-- the account to a new phone or a fresh login. It is a presentation preference
-- and nothing else — no vocabulary, message, progress or review data is scoped
-- by it, and both shells read and write exactly the same rows.

alter table public.profiles
  add column if not exists interface_mode text not null default 'standard';

do $$
begin
  alter table public.profiles
    add constraint profiles_interface_mode_check
    check (interface_mode in ('standard', 'yumi-cosmic'));
exception
  when duplicate_object then null;
end $$;
