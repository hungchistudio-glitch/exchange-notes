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
-- ── Half one of two: safe to apply before the deploy ───────────────────
--
-- Everything here is additive, with one exception noted below. The columns
-- arrive nullable and the existing primary key stays, so the browser code in
-- production right now — which writes no pair at all — keeps working. The
-- unique index on the full key is created here rather than in the second half
-- so that the deploy which follows has something for its upsert to conflict
-- on from its first request.
--
-- The exception: rows written before this migration carry no pair. They
-- cannot be labelled retroactively — asserting a pair that was never recorded
-- is how a French meaning gets served as an Italian one — and every read in
-- the new code filters on a pair that a NULL cannot match, so they are
-- deleted here rather than left unreachable. The cost is that those messages
-- are read once more, at the price the first reading cost.
--
-- 20260911190500_message_analysis_pair_key finishes the job and must be
-- applied only *after* the deploy is live.

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

-- Tolerant of the all-NULL shape for as long as the previous deploy is still
-- writing it. The second half removes that branch.
alter table public.message_language_analysis
  drop constraint if exists message_language_analysis_language_pair_check;

alter table public.message_language_analysis
  add constraint message_language_analysis_language_pair_check
  check (
    (learning_language is null and native_language is null)
    or (
      learning_language in ('en', 'zh-TW', 'es', 'fr', 'it')
      and native_language in ('en', 'zh-TW', 'es', 'fr', 'it')
      and learning_language <> native_language
    )
  ) not valid;

alter table public.detected_phrases
  drop constraint if exists detected_phrases_language_pair_check;

alter table public.detected_phrases
  add constraint detected_phrases_language_pair_check
  check (
    (learning_language is null and native_language is null)
    or (
      learning_language in ('en', 'zh-TW', 'es', 'fr', 'it')
      and native_language in ('en', 'zh-TW', 'es', 'fr', 'it')
      and learning_language <> native_language
    )
  ) not valid;

-- The full cache key, as a unique index for now. It becomes the primary key
-- in the second half, once the columns can be made NOT NULL.
create unique index if not exists message_language_analysis_pair_key
  on public.message_language_analysis (
    message_id,
    user_id,
    learning_language,
    native_language
  );

-- Phrases are read by (reader, pair, messages) and rendered in stored order.
create index if not exists detected_phrases_reader_pair_idx
  on public.detected_phrases (
    user_id,
    learning_language,
    native_language,
    message_id,
    position
  );

comment on column public.message_language_analysis.learning_language is
  'Learning side of the directed profile pair this reading was generated for. Becomes part of the primary key so each pair caches independently.';

comment on column public.message_language_analysis.native_language is
  'Native/support side of the directed profile pair the meanings are written in. Becomes part of the primary key.';

comment on column public.detected_phrases.learning_language is
  'Learning side of the pair these phrases were detected for, matching the analysis row they belong to.';

comment on column public.detected_phrases.native_language is
  'Native/support side of the pair these meanings are written in, matching the analysis row they belong to.';
