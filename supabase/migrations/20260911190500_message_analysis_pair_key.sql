-- Half two of two, after 20260911190225_message_analysis_language_pair.
--
-- Apply this only once the deploy that writes the directed pair on every
-- reading is live. Applied before it, the running browser code writes a NULL
-- pair into columns this migration has just made NOT NULL, and every message
-- reading fails.
--
-- What is left to do is make the pair mandatory and promote the unique index
-- created by the first half into the primary key. Nothing new is added.
--
-- One residual worth naming rather than hiding: between the two halves both
-- versions of the code are writing. The old one still holds the (message_id,
-- user_id) primary key, so a reading it caches during the window blocks the
-- new code from caching a different pair for that same message until this
-- migration removes that key. The cost is one enrichment card, regenerated
-- the next time the conversation is opened — the timeline never waits on it.

-- Anything the previous deploy wrote during the window.
delete from public.detected_phrases
where learning_language is null
   or native_language is null;

delete from public.message_language_analysis
where learning_language is null
   or native_language is null;

alter table public.message_language_analysis
  alter column learning_language set not null,
  alter column native_language set not null;

alter table public.detected_phrases
  alter column learning_language set not null,
  alter column native_language set not null;

-- The all-NULL branch existed only for the overlap. Re-stated without it, and
-- validated: the deletes above guarantee every remaining row passes.
alter table public.message_language_analysis
  drop constraint if exists message_language_analysis_language_pair_check;

alter table public.message_language_analysis
  add constraint message_language_analysis_language_pair_check
  check (
    learning_language in ('en', 'zh-TW', 'es', 'fr', 'it')
    and native_language in ('en', 'zh-TW', 'es', 'fr', 'it')
    and learning_language <> native_language
  );

alter table public.detected_phrases
  drop constraint if exists detected_phrases_language_pair_check;

alter table public.detected_phrases
  add constraint detected_phrases_language_pair_check
  check (
    learning_language in ('en', 'zh-TW', 'es', 'fr', 'it')
    and native_language in ('en', 'zh-TW', 'es', 'fr', 'it')
    and learning_language <> native_language
  );

-- `detected_phrases` has no foreign key into this table — it references
-- `messages` and `auth.users` directly — so the key can be replaced without
-- rebuilding anything else. The index built by the first half is adopted
-- rather than recreated, so no second copy is written.
alter table public.message_language_analysis
  drop constraint if exists message_language_analysis_pkey;

alter table public.message_language_analysis
  add constraint message_language_analysis_pkey
  primary key using index message_language_analysis_pair_key;
