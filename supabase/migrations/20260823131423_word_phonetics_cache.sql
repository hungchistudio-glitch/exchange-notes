-- Phonetic annotations, looked up once and kept.
--
-- The IPA for a word does not change, so the only reason this app was
-- willing to annotate English and nothing else was cost: the endpoint fires
-- once per word every time a vocabulary drawer opens, and routing that
-- through a rate-limited model would have burned the quota the Daily News
-- rework exists to protect.
--
-- A cache removes the objection rather than working around it. Quota is
-- then bounded by how many *distinct new words* the app has ever seen, not
-- by how often anyone opens a drawer, and it decays toward zero.
--
-- Not user data: two people saving "consulenza" want the same transcription.
-- One row serves everybody, which is also why there is no user_id here and
-- nothing to scope by.

create table if not exists public.word_phonetics (
  language    text        not null,
  text        text        not null,
  ipa         text        not null,
  -- Which source produced it, so a bad batch can be found and dropped
  -- without throwing away transcriptions that came from a dictionary.
  source      text        not null,
  created_at  timestamptz not null default now(),
  primary key (language, text)
);

alter table public.word_phonetics enable row level security;

-- Readable by anyone signed in. There is nothing private in a transcription,
-- and the alternative is every reader's first lookup of a common word paying
-- for a fresh call.
create policy "word_phonetics are readable by signed-in readers"
  on public.word_phonetics
  for select
  to authenticated
  using (true);

-- Deliberately no insert/update/delete policy. Writes go through the server
-- route on the service key, which is what keeps the cache from becoming a
-- place anyone can put arbitrary text in front of everyone else.

create index if not exists word_phonetics_language_idx
  on public.word_phonetics (language);
