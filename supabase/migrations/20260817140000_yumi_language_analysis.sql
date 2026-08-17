-- Yumi's language layer for Messages: what a message actually said, and which
-- parts of it were worth explaining.
--
-- Two tables, and the shape of the first one is the whole design decision.
-- Analysis is keyed by (message_id, user_id) rather than by message alone,
-- because "is this worth explaining?" has no answer without a reader. Two
-- people in the same conversation are learning opposite languages: an English
-- message is study material for the one learning English and ordinary reading
-- for the native speaker, and the meanings have to arrive in the reader's own
-- language. One row per message would have to pick one of them to be wrong.
--
-- Nothing here is on the path of sending or receiving a message. A missing row
-- means the card has not arrived yet; a failed row means it is not coming.
-- Both render as a conversation without a card, which is what §45 and §52 ask
-- for — the messaging has to work when the model does not.

-- ---------- message_language_analysis ----------

create table if not exists public.message_language_analysis (
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,

  -- pending: asked for, not back yet. ready: has phrases, or deliberately none.
  -- failed: the model or the network said no. skipped: nothing here to explain,
  -- which is a real answer and not an error — most messages are not lessons.
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'failed', 'skipped')),

  /*
   * Tone, and how sure Yumi is of it.
   *
   * §22 asks for tone read from the conversation rather than the sentence, and
   * for uncertainty to be shown rather than smoothed over. The confidence
   * column is what lets the card say "probably" instead of inventing
   * certainty; a null tone means it declined to guess.
   */
  tone text check (tone is null or char_length(tone) <= 60),
  tone_confidence text
    check (tone_confidence is null or tone_confidence in ('high', 'medium', 'low')),

  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (message_id, user_id)
);

alter table public.message_language_analysis enable row level security;

create index if not exists message_language_analysis_conversation_idx
  on public.message_language_analysis (conversation_id, user_id);

-- Only ever your own reading of a message, and only in conversations you are
-- in. The second half matters: without it, knowing a message id would be
-- enough to attach a row to someone else's conversation.
do $$ begin
  create policy "Users can view their own analysis"
    on public.message_language_analysis
    for select to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can create their own analysis"
    on public.message_language_analysis
    for insert to authenticated
    with check (
      auth.uid() = user_id
      and public.is_conversation_member(conversation_id)
      and exists (
        select 1 from public.messages m
        where m.id = message_id and m.conversation_id = conversation_id
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update their own analysis"
    on public.message_language_analysis
    for update to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own analysis"
    on public.message_language_analysis
    for delete to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ---------- detected_phrases ----------

create table if not exists public.detected_phrases (
  id uuid primary key default gen_random_uuid(),
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  -- The literal substring as it appears in the message, so the bubble can
  -- find and underline it rather than guessing at a paraphrase.
  phrase text not null check (char_length(phrase) between 1 and 120),

  phrase_type text not null default 'phrase'
    check (phrase_type in ('expression', 'abbreviation', 'phrase', 'slang', 'idiom')),

  -- In the reader's language. This is the half that makes the row per-user.
  meaning text not null check (char_length(meaning) between 1 and 400),

  -- Abbreviations only: "lmk" -> "let me know". Null for everything else.
  expanded text check (expanded is null or char_length(expanded) <= 200),

  -- Render order, decided by the model rather than by string position, so the
  -- most useful item can lead.
  position integer not null default 0,

  created_at timestamptz not null default now()
);

alter table public.detected_phrases enable row level security;

create index if not exists detected_phrases_message_user_idx
  on public.detected_phrases (message_id, user_id, position);

do $$ begin
  create policy "Users can view their own detected phrases"
    on public.detected_phrases
    for select to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can create their own detected phrases"
    on public.detected_phrases
    for insert to authenticated
    with check (
      auth.uid() = user_id
      and exists (
        select 1
        from public.messages m
        where m.id = message_id
          and public.is_conversation_member(m.conversation_id)
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can delete their own detected phrases"
    on public.detected_phrases
    for delete to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

comment on table public.message_language_analysis is
  'Yumi''s reading of one message for one person. Keyed by reader because the two people in a conversation are learning opposite languages.';

comment on table public.detected_phrases is
  'The individual expressions Yumi pulled out of a message, in the reader''s language.';
