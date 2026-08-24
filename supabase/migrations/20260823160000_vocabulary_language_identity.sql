-- A saved word remembers the language it was born in.
--
-- vocabulary_items has named both of a row's languages since the axis
-- widening (20260821225803). What it has never recorded is *how* it came to
-- name them — whether the reader stated it, a model reported it, or a
-- default filled it in — which is the difference between a value worth
-- trusting and one worth asking about. Without it there is no way to find
-- the rows that were guessed, and no way to tell a correction apart from
-- the guess it corrected.
--
-- Additive. No column is dropped, no row is removed, and nothing here
-- changes what an existing row means; the backfill only writes the new
-- columns. Safe to run before the app that reads them is deployed.

/* =========================================================
   The provenance columns
   ========================================================= */

alter table public.vocabulary_items
  add column if not exists language_source text not null
    default 'legacy-inferred',
  add column if not exists language_confidence real,
  add column if not exists language_pair_at_creation jsonb,
  add column if not exists needs_language_review boolean not null
    default false;

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_language_source_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_language_source_check
  check (
    language_source = any (array[
      'user-settings',
      'explicit-selection',
      'ai',
      'auto-detected',
      'legacy-inferred',
      'user-corrected'
    ])
  );

-- Null means "never measured", which is a different thing from zero and the
-- honest value for every row written before this column existed.
alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_language_confidence_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_language_confidence_check
  check (
    language_confidence is null
    or (language_confidence >= 0 and language_confidence <= 1)
  );

-- The pair the reader had set at the moment of saving: an object with
-- exactly the two keys, each a language code. Bounded for the same reason
-- texts and examples are — this holds two short tags, and anything larger
-- is a bug rather than a pair.
alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_language_pair_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_language_pair_check
  check (
    language_pair_at_creation is null
    or (
      jsonb_typeof(language_pair_at_creation) = 'object'
      and language_pair_at_creation ? 'primary'
      and language_pair_at_creation ? 'secondary'
      and language_pair_at_creation ->> 'primary'
          = any (array['en', 'zh-TW', 'es', 'fr', 'it'])
      and language_pair_at_creation ->> 'secondary'
          = any (array['en', 'zh-TW', 'es', 'fr', 'it'])
      and octet_length(language_pair_at_creation::text) <= 128
    )
  );

/* =========================================================
   Backfill

   Every existing row already names both its languages, and those names were
   derived — in 20260821225803 — from the `language` column the row was
   actually written with. That is a deterministic mapping from something the
   row said about itself, not a guess, so the pair is reconstructed from it
   rather than re-detected.

   'legacy-inferred' is the truthful source: the values are right, and they
   were arrived at by migration rather than by anything the reader or a model
   said at the time. Confidence stays null — nothing measured it, and filling
   in a number here would be inventing evidence for rows that have none,
   which is the failure this whole column exists to prevent.

   needs_language_review stays false. The derivation was deterministic, so
   there is nothing for the reader to check; the flag is reserved for rows a
   detector actually guessed at.
   ========================================================= */

update public.vocabulary_items
set language_pair_at_creation = jsonb_build_object(
      'primary', word_language,
      'secondary', translation_language
    )
where language_pair_at_creation is null;

/* =========================================================
   The transitional defaults come out

   20260821225803 left word_language / translation_language defaulting to
   'en' / 'zh-TW' so that inserts written before those columns existed kept
   working, with a note saying to remove the defaults once every insert site
   sets them — because a default that says English silently files a Spanish
   word as English, and a silently mislabelled row is invisible forever.

   Every insert site now goes through createVocabularyEntry
   (lib/vocabulary/createEntry.ts), which cannot produce a payload without
   both languages, and the offline outbox carries them too. So the defaults
   go. An insert from a stale client that omits them now fails loudly, which
   is a save the reader can retry rather than a word filed under the wrong
   language for the rest of its life.

   NOT NULL is kept. It is the half of the guarantee that still holds.
   ========================================================= */

alter table public.vocabulary_items
  alter column word_language drop default,
  alter column translation_language drop default;

/* =========================================================
   Indexes — deliberately none

   The language filter runs on the client, over the library the vocabulary
   screen has already fetched in full (`select * where user_id = ...`, served
   by vocabulary_items_user_created_idx). No query filters on word_language
   in the database, so an index on it would never be planned and would only
   cost write amplification on every save.

   When a language-scoped query does reach the server — a review queue that
   asks for one language, say — the index it wants is
   (user_id, word_language, next_review_at), and it should be added with that
   query rather than ahead of it.
   ========================================================= */

/* =========================================================
   Row security is untouched

   The four owner-only policies on this table are written against user_id
   alone and are unaffected by new columns: a reader still sees and writes
   only their own rows, and nothing here grants a new path to anyone else's.
   ========================================================= */

comment on column public.vocabulary_items.language_source is
  'How this row''s languages were arrived at: user-settings, explicit-selection, ai, auto-detected, legacy-inferred, user-corrected. See LanguageMetadataSource in lib/vocabulary/languageIdentity.ts.';

comment on column public.vocabulary_items.language_confidence is
  'How sure the app was, 0-1. Null means never measured — not zero. 1 only where something stated the language rather than inferring it.';

comment on column public.vocabulary_items.language_pair_at_creation is
  'The reader''s learning pair at the moment of saving, {primary, secondary}. Historical context, never a substitute for word_language / translation_language.';

comment on column public.vocabulary_items.needs_language_review is
  'The languages were guessed and the guess was not good enough to act on silently. Cleared by the card''s Change language action.';

comment on column public.vocabulary_items.word_language is
  'BCP-47 language of `word`, and the row''s permanent identity. Never rewritten by a change to the reader''s settings.';
