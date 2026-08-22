-- The contract half of the language-encoding migration.
--
-- profiles has carried both encodings since the allowlist was widened: the
-- prose values the app used to write, and the BCP-47 codes it writes now.
-- This converts what is left and closes the door behind it.
--
-- ORDER MATTERS, AND NOT ONLY INSIDE THIS FILE. Every reader of these two
-- columns has to already take either encoding before this runs. Applied
-- against a deployment that still compares against 'traditional-chinese',
-- this silently turns every Chinese learner into an English one — the
-- comparison does not error, it just stops being true. The code that reads
-- both shipped first, deliberately.

/* =========================================================
   Backfill
   ========================================================= */

update public.profiles
set
  native_language = case native_language
    when 'english'             then 'en'
    when 'traditional-chinese' then 'zh-TW'
    else native_language
  end,
  learning_language = case learning_language
    when 'english'             then 'en'
    when 'traditional-chinese' then 'zh-TW'
    else learning_language
  end
where native_language in ('english', 'traditional-chinese')
   or learning_language in ('english', 'traditional-chinese');

/* =========================================================
   Allowlists, narrowed to codes

   The prose values are gone from the data, so they come out of the
   constraint too. A row written by something that has not been updated now
   fails loudly instead of being accepted into a column that means something
   else.
   ========================================================= */

alter table public.profiles
  drop constraint if exists profiles_native_language_check;

alter table public.profiles
  add constraint profiles_native_language_check
  check (
    native_language is null
    or native_language = any (array['en', 'zh-TW', 'es', 'fr', 'it'])
  );

alter table public.profiles
  drop constraint if exists profiles_learning_language_check;

alter table public.profiles
  add constraint profiles_learning_language_check
  check (
    learning_language is null
    or learning_language = any (array['en', 'zh-TW', 'es', 'fr', 'it'])
  );

/* =========================================================
   The pair must still be two different languages

   Back to comparing the values directly. The normalising CASE existed only
   because 'english' and 'en' were the same language spelled two ways and a
   plain <> could not see it. With one encoding left there is nothing to
   normalise, and the simpler constraint is the honest one.
   ========================================================= */

alter table public.profiles
  drop constraint if exists profiles_different_languages_check;

alter table public.profiles
  add constraint profiles_different_languages_check
  check (
    native_language is null
    or learning_language is null
    or native_language <> learning_language
  );

/* =========================================================
   Notes carried in the schema itself
   ========================================================= */

comment on column public.profiles.native_language is
  'BCP-47 language code. Was a prose encoding until this migration.';

comment on column public.profiles.learning_language is
  'BCP-47 language code. Was a prose encoding until this migration.';

-- vocabulary_items.language is deliberately untouched. It is the deprecated
-- half of that table's pair, still written as prose by every insert site, and
-- narrowing it here would break saving a word. It goes when its writers do.
