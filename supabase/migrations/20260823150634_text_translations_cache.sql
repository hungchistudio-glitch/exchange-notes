-- Translations of text that is not in a row anybody owns.
--
-- A word card sent into a conversation before shared cards carried every
-- language holds two, and they may be two the reader never chose. Their own
-- vocabulary can be filled in because it is their row; a message is not —
-- it belongs to whoever sent it, and rewriting someone's sent message to
-- change what it says is not a thing this app does.
--
-- So the message stays exactly as sent and the *rendering* gains the
-- reader's language, out of here. Looked up once, ever, across everybody:
-- two people sent the same dish name want the same French for it.
--
-- Same shape and same reasoning as word_phonetics, and deliberately a
-- second table rather than a column on it — one answers "how is this said",
-- the other "what does this say", and a row that has one very often does
-- not have the other.

create table if not exists public.text_translations (
  source_language text        not null,
  source_text     text        not null,
  target_language text        not null,
  text            text        not null,
  source          text        not null,
  created_at      timestamptz not null default now(),
  primary key (source_language, source_text, target_language)
);

alter table public.text_translations enable row level security;

create policy "text_translations are readable by signed-in readers"
  on public.text_translations
  for select
  to authenticated
  using (true);

-- No insert/update/delete policy: writes go through the server route on the
-- service key, which is what keeps this from becoming a place anyone can put
-- arbitrary text in front of everyone else.

create index if not exists text_translations_target_idx
  on public.text_translations (target_language);
