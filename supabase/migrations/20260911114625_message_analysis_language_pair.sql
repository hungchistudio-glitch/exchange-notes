-- A message explanation is written in the reader's native language and judged
-- against the language they are learning, so it belongs to a directed pair and
-- not merely to a reader. The old key identified message + reader, which meant
-- switching either profile language silently reused the previous pair's
-- meanings.
--
-- The product supports all twenty directed pairs, and a reader who moves
-- between them should not pay the model again for a reading already generated.
-- So the pair becomes part of the cache key rather than a tag on a single row:
-- every pair caches independently and switching back is free.
--
-- Rows written before this migration carry no pair. They cannot be labelled
-- retroactively — asserting a pair that was never recorded is how a French
-- meaning gets served as an Italian one — and the application already treats
-- them as misses, so they are deleted rather than left unreachable forever.
-- The cost is that those messages are read once more, at the same price the
-- first reading cost.

alter table public.message_language_analysis
  add column if not exists learning_language text,
  add column if not exists native_language text;

alter table public.detected_phrases
  add column if not exists learning_language text,
  add column if not exists native_language text;

-- Phrases first: they are the detail rows, and deleting them second would
-- leave a window where an analysis row has no phrases to find.
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

-- The pair joins the primary key. `detected_phrases` has no foreign key into
-- this table — it references `messages` and `auth.users` directly — so the key
-- can be replaced without dropping and rebuilding anything else.
alter table public.message_language_analysis
  drop constraint if exists message_language_analysis_pkey;

alter table public.message_language_analysis
  add constraint message_language_analysis_pkey
  primary key (message_id, user_id, learning_language, native_language);

-- Phrases are read by (reader, messages, pair) and rendered in stored order.
create index if not exists detected_phrases_reader_pair_idx
  on public.detected_phrases (
    user_id,
    learning_language,
    native_language,
    message_id,
    position
  );

comment on column public.message_language_analysis.learning_language is
  'Learning side of the directed profile pair this reading was generated for. Part of the primary key: each pair caches independently.';

comment on column public.message_language_analysis.native_language is
  'Native/support side of the directed profile pair the meanings are written in. Part of the primary key.';

comment on column public.detected_phrases.learning_language is
  'Learning side of the pair these phrases were detected for, matching the analysis row they belong to.';

comment on column public.detected_phrases.native_language is
  'Native/support side of the pair these meanings are written in, matching the analysis row they belong to.';
