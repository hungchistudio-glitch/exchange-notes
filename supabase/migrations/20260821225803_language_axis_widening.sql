-- Widen the language columns so a third language becomes expressible.
--
-- Two encodings are live after this migration, on purpose. The columns still
-- hold the prose values the app writes today ('english' /
-- 'traditional-chinese'); the allowlists also admit BCP-47 codes so new code
-- can write them before every reader has been converted. Converting the
-- stored values is a later migration, once the ~66 call sites that compare
-- against the prose values have moved to lib/languages.ts. Nothing here
-- changes what any existing row means.

/* =========================================================
   profiles — allowlists
   ========================================================= */

alter table public.profiles
  drop constraint if exists profiles_native_language_check;

alter table public.profiles
  add constraint profiles_native_language_check
  check (
    native_language is null
    or native_language = any (array[
      -- Legacy prose encoding, still what the app writes.
      'english', 'traditional-chinese',
      -- BCP-47, matching LanguageCode in lib/languages.ts.
      'en', 'zh-TW', 'es', 'fr', 'it'
    ])
  );

alter table public.profiles
  drop constraint if exists profiles_learning_language_check;

alter table public.profiles
  add constraint profiles_learning_language_check
  check (
    learning_language is null
    or learning_language = any (array[
      'english', 'traditional-chinese',
      'en', 'zh-TW', 'es', 'fr', 'it'
    ])
  );

/* =========================================================
   profiles — the pair must still be two different languages

   Kept, and strengthened. Comparing the raw strings was sufficient while one
   encoding existed; with both live, native_language = 'english' against
   learning_language = 'en' is one language written two ways and would have
   passed. The comparison now runs on the normalized code.

   Written inline rather than through a helper function: a CHECK constraint
   that calls a user-defined function has to have that function restored
   before the table, which is a needless thing to get wrong in a dump.
   ========================================================= */

alter table public.profiles
  drop constraint if exists profiles_different_languages_check;

alter table public.profiles
  add constraint profiles_different_languages_check
  check (
    native_language is null
    or learning_language is null
    or (case native_language
          when 'english'             then 'en'
          when 'traditional-chinese' then 'zh-TW'
          else native_language
        end)
       <> (case learning_language
             when 'english'             then 'en'
             when 'traditional-chinese' then 'zh-TW'
             else learning_language
           end)
  );

/* =========================================================
   vocabulary_items — allowlist

   Not named in the plan, but this column carries the same constraint and
   would have blocked a non-English word just as firmly.
   ========================================================= */

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_language_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_language_check
  check (
    language = any (array[
      'english', 'traditional-chinese',
      'en', 'zh-TW', 'es', 'fr', 'it'
    ])
  );

/* =========================================================
   vocabulary_items — the pair becomes explicit

   A row is a pair: `word` in one language, `translation` in another, with
   `language` naming the first. That leaves the second implied — readable
   only because there were exactly two languages to choose from. These two
   columns say both halves outright, which is what lets a third language be
   added without the review engine having to care.
   ========================================================= */

alter table public.vocabulary_items
  add column if not exists word_language text,
  add column if not exists translation_language text;

-- Backfill derived from the existing column rather than assumed. Every row in
-- production is english/traditional-chinese, but deriving costs nothing and
-- does not quietly mislabel a row that is not.
update public.vocabulary_items
set
  word_language = case language
    when 'english'             then 'en'
    when 'traditional-chinese' then 'zh-TW'
    else language
  end,
  translation_language = case language
    when 'english'             then 'zh-TW'
    when 'traditional-chinese' then 'en'
    -- Unreachable under the old allowlist; left explicit so a future
    -- encoding cannot silently produce a null here.
    else null
  end
where word_language is null
   or translation_language is null;

alter table public.vocabulary_items
  alter column word_language set default 'en',
  alter column translation_language set default 'zh-TW';

alter table public.vocabulary_items
  alter column word_language set not null,
  alter column translation_language set not null;

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_word_language_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_word_language_check
  check (word_language = any (array['en', 'zh-TW', 'es', 'fr', 'it']));

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_translation_language_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_translation_language_check
  check (translation_language = any (array['en', 'zh-TW', 'es', 'fr', 'it']));

-- A pair of the same language is not a pair.
alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_different_languages_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_different_languages_check
  check (word_language <> translation_language);

/* =========================================================
   Notes carried in the schema itself
   ========================================================= */

comment on column public.vocabulary_items.language is
  'Deprecated. The language of `word`, in the legacy prose encoding. Superseded by word_language; every writer still sets it. Drop once no reader remains.';

comment on column public.vocabulary_items.word_language is
  'BCP-47 language of `word`. The default exists only so inserts written before this column did keep working, and every one of them saves English — remove the default once the insert sites set it explicitly, or a Spanish word saved by old code will be filed as English.';

comment on column public.vocabulary_items.translation_language is
  'BCP-47 language of `translation`. See word_language on the transitional default.';

comment on column public.profiles.native_language is
  'Accepts both the legacy prose encoding and BCP-47 codes during the migration to five languages. New code should write codes.';

comment on column public.profiles.learning_language is
  'Accepts both the legacy prose encoding and BCP-47 codes during the migration to five languages. New code should write codes.';
