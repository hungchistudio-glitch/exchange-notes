-- A saved word becomes one concept known in N languages.
--
-- The pair was the ceiling. A row holds `word` and `translation` and names
-- the language of each, which is two texts and no more — so the same word
-- learned against a third language became a second row, with its own review
-- schedule, unlinked to the first. Five languages turn one word into as many
-- as ten disconnected rows and ten separate memories of it.
--
-- These two columns hold every language a word is known in, keyed by code.
-- The row stays one row: the review engine still schedules per row and still
-- does not know what language anything is in, which is the property worth
-- protecting. Adding a language is adding a key.
--
-- Purely additive, and safe to run before the app knows about it. Nothing
-- reads these yet; code that does not select them is unaffected, and code
-- that selects * gets two fields it ignores.

alter table public.vocabulary_items
  add column if not exists texts jsonb not null default '{}'::jsonb,
  add column if not exists examples jsonb not null default '{}'::jsonb;

/* =========================================================
   Backfill from the pair each row already carries
   ========================================================= */

update public.vocabulary_items
set
  texts = jsonb_strip_nulls(
    jsonb_build_object(
      word_language, nullif(btrim(word), ''),
      translation_language, nullif(btrim(translation), '')
    )
  ),
  examples = jsonb_strip_nulls(
    jsonb_build_object(
      word_language, nullif(btrim(coalesce(example_sentence, '')), ''),
      translation_language,
        nullif(btrim(coalesce(translated_example, '')), '')
    )
  )
where texts = '{}'::jsonb;

/* =========================================================
   Shape guards

   Objects, not arrays or scalars, and bounded — a vocabulary row holds a
   handful of short strings per language, and anything much larger is a bug
   rather than a word.
   ========================================================= */

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_texts_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_texts_check
  check (
    jsonb_typeof(texts) = 'object'
    and octet_length(texts::text) <= 4096
  );

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_examples_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_examples_check
  check (
    jsonb_typeof(examples) = 'object'
    and octet_length(examples::text) <= 8192
  );

comment on column public.vocabulary_items.texts is
  'The word in every language it is known in, keyed by BCP-47 code. Supersedes the word/translation pair, which is kept while readers migrate.';

comment on column public.vocabulary_items.examples is
  'The example sentence in every language it exists in, keyed by BCP-47 code. A language present in texts but absent here simply has no example yet.';
