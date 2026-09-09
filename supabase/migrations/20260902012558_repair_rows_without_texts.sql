-- Three word rows never got the language map, and cannot be rendered.
--
-- They were saved before `texts`/`examples` existed and were missed when the
-- rest of the library was migrated onto it: word, translation and both
-- example columns are present and correct, but the maps are `{}`. Every
-- screen reads the map first, so these three show a blank example, are
-- skipped by the background language fill, and were the only rows the
-- example rewrite could not touch — there was no word in any language for it
-- to write a sentence about.
--
-- Conditional on the map actually being empty, so this is a no-op anywhere
-- the rows do not exist and cannot run twice.

-- One of the three is also mislabelled. `affamé` is stored French → zh-TW,
-- but its translation is "hungry" and its translated example is English. Left
-- alone, the backfill below would file English text under a Chinese key,
-- which is precisely the mistake the language work exists to prevent.
--
-- The test is narrow on purpose: a translation labelled Traditional Chinese
-- that contains no Han character at all is not Traditional Chinese. It is
-- scoped to the broken rows so it cannot reach anything else.
--
-- Recorded as 'auto-detected' and flagged for review, because that is what it
-- is: a guess made from the absence of Han characters, not something the
-- reader told us. The app already knows how to ask about an uncertain
-- language, and this is exactly the case that mechanism is for.
update public.vocabulary_items
   set translation_language = 'en',
       language_source = 'auto-detected',
       needs_language_review = true
 where (texts is null or texts = '{}'::jsonb)
   and translation_language = 'zh-TW'
   and nullif(btrim(translation), '') is not null
   and translation !~ '[一-龥]';

-- Now the maps, built from the columns that do hold the content.
update public.vocabulary_items
   set texts = jsonb_strip_nulls(
         jsonb_build_object(
           word_language, nullif(btrim(word), ''),
           translation_language, nullif(btrim(translation), '')
         )
       ),
       examples = jsonb_strip_nulls(
         jsonb_build_object(
           word_language, nullif(btrim(example_sentence), ''),
           translation_language, nullif(btrim(translated_example), '')
         )
       )
 where (texts is null or texts = '{}'::jsonb)
   and word_language is not null
   and translation_language is not null
   and word_language <> translation_language;
