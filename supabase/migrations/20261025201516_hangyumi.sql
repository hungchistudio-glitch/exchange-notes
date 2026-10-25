-- Hangyumi: Hangman with Yumi (Chi, 2026-10-25).
--
-- A word from a graded bank (B1-C2, in each of the five learning languages)
-- is guessed a letter at a time; three misses hang Yumi's eye, then her arm,
-- then her body, and the round is over. Each distinct correct letter pays
-- once, finishing the word pays a bonus, and cookies won before a loss are
-- kept:
--
--          a letter   the word
--   B1         3          9
--   B2         6         18
--   C1         9         27
--   C2        12         36
--
-- at most 333 a day, the reader's own day (ai_quota_local_day, the same
-- midnight as the AI quota). When less than a payment is left, what is left
-- is paid. A word pays each of its rewards once a day per language, whatever
-- the level, the tab or the device: hangyumi_awards is keyed on the word,
-- not the round. Playing on after the cap is practice and pays nothing.
--
-- The game never touches learning: no saved word, no review record, no
-- statistic. Its cookies are their own ledger kind, 'game', so the shop can
-- say where they came from and can never count them as learning.
--
-- The answer never leaves the database while a round is being played: the
-- browser is sent the mask, and the answer only once the round is over.
--
-- Words are drafted as 'draft' and only an approved word is ever dealt
-- (Chi reviews them on /hangyumi/review). A level with no approved word
-- says so; it never falls back to another level.
--
-- Safe before the deploy: everything here is new, the two widened checks on
-- the ledger only let a new kind in, and yumi_wardrobe_state gains a key the
-- live code ignores.

-- ------------------------------------------------------------- the ledger

alter table public.yumi_energy_ledger drop constraint if exists yumi_energy_ledger_kind_check;
alter table public.yumi_energy_ledger add constraint yumi_energy_ledger_kind_check
  check (kind in ('opening','save','review','purchase','paid','refund','game'));

alter table public.yumi_energy_ledger drop constraint if exists yumi_energy_ledger_check;
alter table public.yumi_energy_ledger add constraint yumi_energy_ledger_check
  check ((kind in ('opening','save','review','paid','game') and amount >= 0)
      or (kind = 'purchase' and amount < 0)
      or kind = 'refund');

create or replace function private.yumi_wardrobe_state(p_user_id uuid) returns jsonb
 language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
 'earned', coalesce(sum(l.amount) filter(where l.kind in ('opening','save','review')),0),
 'paid', coalesce(sum(l.amount) filter(where l.kind='paid'),0),
 'game', coalesce(sum(l.amount) filter(where l.kind='game'),0),
 'spent', coalesce(w.cookies_spent,0),
 'balance', greatest(0,coalesce(sum(l.amount),0)),
 'owned', coalesce(to_jsonb(w.owned_item_ids),'[]'::jsonb),
 'outfit', coalesce(w.outfit,'{}'::jsonb))
 from (select p_user_id as id) u
 left join public.yumi_energy_ledger l on l.user_id=u.id
 left join public.yumi_wardrobe w on w.user_id=u.id
 group by w.cookies_spent,w.owned_item_ids,w.outfit;
$$;

-- ----------------------------------------------------------- the word bank

create table if not exists public.hangyumi_words (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('en','zh-TW','es','fr','it')),
  level text not null check (level in ('B1','B2','C1','C2')),
  -- Stored in NFC, so a letter is one code point and é is not e + ́.
  answer text not null check (answer = normalize(answer, NFC) and btrim(answer) = answer and answer <> ''),
  canonical text generated always as (private.yumi_word_key(answer)) stored,
  part_of_speech text not null,
  -- A clue in each of the five languages, none of which names the answer.
  clues jsonb not null check (clues ?& array['en','zh-TW','es','fr','it']),
  -- The list the level was judged against.
  source text not null,
  status text not null default 'draft' check (status in ('draft','approved','rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language, canonical)
);

create index if not exists hangyumi_words_deal on public.hangyumi_words(language, level) where status = 'approved';
create index if not exists hangyumi_words_reviewed_by on public.hangyumi_words(reviewed_by);

alter table public.hangyumi_words enable row level security;
revoke all on public.hangyumi_words from public, anon, authenticated;

-- Who may approve words. Chi, to start with.
create table if not exists private.hangyumi_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.hangyumi_reviewers from public, anon, authenticated;

insert into private.hangyumi_reviewers(user_id)
select id from public.profiles where exchange_id = 'hungchichang'
on conflict do nothing;

-- ------------------------------------------------------- rounds and awards

create table if not exists public.hangyumi_rounds (
  -- Chosen by the browser, so a start sent twice deals one round.
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id uuid not null references public.hangyumi_words(id) on delete cascade,
  hint_language text not null check (hint_language in ('en','zh-TW','es','fr','it')),
  status text not null default 'playing' check (status in ('playing','won','lost')),
  guessed text[] not null default '{}',
  misses smallint not null default 0 check (misses between 0 and 3),
  earned integer not null default 0 check (earned >= 0),
  -- Chinese is guessed from a set of characters; the set is kept so a
  -- reload shows the same one.
  keyboard text[],
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists hangyumi_rounds_user_word on public.hangyumi_rounds(user_id, word_id, created_at desc);
create index if not exists hangyumi_rounds_word on public.hangyumi_rounds(word_id);

alter table public.hangyumi_rounds enable row level security;
revoke all on public.hangyumi_rounds from public, anon, authenticated;

create table if not exists public.hangyumi_awards (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_day date not null,
  language text not null,
  canonical text not null,
  -- 'letter:<the letter>' or 'complete'.
  event text not null,
  amount integer not null check (amount > 0),
  round_id uuid references public.hangyumi_rounds(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, reward_day, language, canonical, event)
);

create index if not exists hangyumi_awards_round on public.hangyumi_awards(round_id);

alter table public.hangyumi_awards enable row level security;
revoke all on public.hangyumi_awards from public, anon, authenticated;

-- -------------------------------------------------------------- the rules

create or replace function private.hangyumi_letter_reward(p_level text) returns integer
 language sql immutable set search_path = '' as $$
 select case p_level when 'B1' then 3 when 'B2' then 6 when 'C1' then 9 when 'C2' then 12 end;
$$;

create or replace function private.hangyumi_word_reward(p_level text) returns integer
 language sql immutable set search_path = '' as $$
 select private.hangyumi_letter_reward(p_level) * 3;
$$;

-- A guessable character: a letter in any script. Spaces, hyphens and
-- apostrophes are shown from the start.
create or replace function private.hangyumi_is_letter(p_char text) returns boolean
 language sql immutable set search_path = '' as $$
 select p_char ~ '^[[:alpha:]]$';
$$;

create or replace function private.hangyumi_today_earned(p_user_id uuid, p_day date) returns integer
 language sql stable security definer set search_path = '' as $$
 select coalesce(sum(amount),0)::integer from public.hangyumi_awards
 where user_id = p_user_id and reward_day = p_day;
$$;

-- What the browser is shown of a round. The answer only once it is over.
create or replace function private.hangyumi_round_state(p_round public.hangyumi_rounds) returns jsonb
 language plpgsql stable security definer set search_path = '' as $$
declare
 w public.hangyumi_words;
 v_day date := public.ai_quota_local_day(p_round.user_id);
 v_today integer := private.hangyumi_today_earned(p_round.user_id, v_day);
 v_chars text[];
 v_slots jsonb := '[]'::jsonb;
 v_letters text[] := '{}';
 c text;
begin
 select * into w from public.hangyumi_words where id = p_round.word_id;
 v_chars := regexp_split_to_array(w.answer, '');
 foreach c in array v_chars loop
  if private.hangyumi_is_letter(c) then
   v_letters := v_letters || lower(c);
   v_slots := v_slots || jsonb_build_array(jsonb_build_object(
    'letter', true,
    'char', case when p_round.status <> 'playing' or lower(c) = any(p_round.guessed) then c end));
  else
   v_slots := v_slots || jsonb_build_array(jsonb_build_object('letter', false, 'char', c));
  end if;
 end loop;
 return jsonb_build_object(
  'id', p_round.id,
  'status', p_round.status,
  'language', w.language,
  'level', w.level,
  'partOfSpeech', w.part_of_speech,
  'hint', coalesce(nullif(w.clues ->> p_round.hint_language, ''), w.clues ->> 'en'),
  'hintLanguage', p_round.hint_language,
  'slots', v_slots,
  'guessed', to_jsonb(p_round.guessed),
  'wrong', (select coalesce(jsonb_agg(g), '[]'::jsonb) from unnest(p_round.guessed) g where g <> all(v_letters)),
  'misses', p_round.misses,
  'maxMisses', 3,
  'keyboard', to_jsonb(p_round.keyboard),
  'earned', p_round.earned,
  'rewards', jsonb_build_object('letter', private.hangyumi_letter_reward(w.level), 'word', private.hangyumi_word_reward(w.level)),
  'today', jsonb_build_object('day', v_day, 'earned', v_today, 'cap', 333, 'remaining', greatest(0, 333 - v_today)),
  'answer', case when p_round.status <> 'playing' then w.answer end);
end;
$$;

-- --------------------------------------------------------------- dealing

create or replace function private.hangyumi_start(p_round_id uuid, p_language text, p_level text, p_hint_language text) returns jsonb
 language plpgsql volatile security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 r public.hangyumi_rounds;
 w public.hangyumi_words;
 v_keyboard text[];
 v_answer_chars text[];
 v_distractors text[];
begin
 if v_user is null then
  raise exception using errcode = '42501', message = 'Authentication is required to play.';
 end if;
 if p_language not in ('en','zh-TW','es','fr','it') or p_hint_language not in ('en','zh-TW','es','fr','it') then
  raise exception using errcode = '22023', message = 'Unknown language.';
 end if;
 if p_level not in ('B1','B2','C1','C2') then
  raise exception using errcode = '22023', message = 'Unknown level.';
 end if;

 select * into r from public.hangyumi_rounds where id = p_round_id;
 if found then
  if r.user_id <> v_user then
   raise exception using errcode = '42501', message = 'That round is not yours.';
  end if;
  return private.hangyumi_round_state(r);
 end if;

 -- The word played longest ago, or never: a new word before a repeat.
 select hw.* into w
 from public.hangyumi_words hw
 left join lateral (
  select max(pr.created_at) as last_played from public.hangyumi_rounds pr
  where pr.user_id = v_user and pr.word_id = hw.id
 ) played on true
 where hw.language = p_language and hw.level = p_level and hw.status = 'approved'
 order by played.last_played nulls first, random()
 limit 1;

 if not found then
  return jsonb_build_object('status', 'missing', 'language', p_language, 'level', p_level);
 end if;

 if w.language = 'zh-TW' then
  select array_agg(distinct ch) into v_answer_chars
  from regexp_split_to_table(w.answer, '') ch where private.hangyumi_is_letter(ch);
  -- Characters from other approved Chinese words, so the wrong keys are
  -- real words' characters too, not noise.
  select array_agg(ch) into v_distractors from (
   select ch from (
    select distinct ch from public.hangyumi_words o, regexp_split_to_table(o.answer, '') ch
    where o.language = 'zh-TW' and o.status = 'approved' and o.id <> w.id
      and private.hangyumi_is_letter(ch) and ch <> all(v_answer_chars)
   ) pool order by random() limit greatest(0, 16 - cardinality(v_answer_chars))
  ) picked;
  v_distractors := coalesce(v_distractors, '{}');
  if cardinality(v_answer_chars) + cardinality(v_distractors) < 16 then
   select v_distractors || coalesce(array_agg(ch), '{}') into v_distractors from (
    select ch from regexp_split_to_table('山海光日月星雲風心學文天地時人路城夜雨花', '') ch
    where ch <> all(v_answer_chars) and ch <> all(v_distractors)
    order by random() limit 16 - cardinality(v_answer_chars) - cardinality(v_distractors)
   ) more;
  end if;
  select array_agg(ch order by random()) into v_keyboard from unnest(v_answer_chars || v_distractors) ch;
 end if;

 insert into public.hangyumi_rounds(id, user_id, word_id, hint_language, keyboard)
 values (p_round_id, v_user, w.id, p_hint_language, v_keyboard)
 on conflict (id) do nothing;

 select * into r from public.hangyumi_rounds where id = p_round_id;
 if r.user_id <> v_user then
  raise exception using errcode = '42501', message = 'That round is not yours.';
 end if;
 return private.hangyumi_round_state(r);
end;
$$;

-- --------------------------------------------------------------- guessing

create or replace function private.hangyumi_guess(p_round_id uuid, p_char text) returns jsonb
 language plpgsql volatile security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 r public.hangyumi_rounds;
 w public.hangyumi_words;
 v_char text := lower(normalize(btrim(coalesce(p_char, '')), NFC));
 v_letters text[];
 v_day date;
 v_hit boolean;
 v_letter_paid integer := 0;
 v_word_paid integer := 0;
 v_already boolean := false;
 v_capped boolean := false;

 -- Pays one event, at most what is left of today's 333, and only once a day
 -- for this word in this language. Returns what was paid.
 v_amount integer;
 v_left integer;
 v_inserted integer;
begin
 if v_user is null then
  raise exception using errcode = '42501', message = 'Authentication is required to play.';
 end if;

 -- Every guess by this reader, in every round and on every device, waits
 -- here for the one before it, so two cannot both read the same "left today".
 insert into public.yumi_wardrobe(user_id) values (v_user) on conflict do nothing;
 perform 1 from public.yumi_wardrobe where user_id = v_user for update;

 select * into r from public.hangyumi_rounds where id = p_round_id and user_id = v_user for update;
 if not found then
  raise exception using errcode = 'P0002', message = 'No such round.';
 end if;
 if r.status <> 'playing' or char_length(v_char) <> 1 or not private.hangyumi_is_letter(v_char)
    or v_char = any(r.guessed) or (r.keyboard is not null and v_char <> all(r.keyboard)) then
  return private.hangyumi_round_state(r) || jsonb_build_object('paid', jsonb_build_object('letter', 0, 'word', 0, 'already', false, 'capped', false), 'repeat', true);
 end if;

 select * into w from public.hangyumi_words where id = r.word_id;
 select array_agg(distinct lower(ch)) into v_letters
 from regexp_split_to_table(w.answer, '') ch where private.hangyumi_is_letter(ch);

 v_hit := v_char = any(v_letters);
 r.guessed := r.guessed || v_char;
 v_day := public.ai_quota_local_day(v_user);

 if v_hit then
  v_left := greatest(0, 333 - private.hangyumi_today_earned(v_user, v_day));
  v_amount := least(private.hangyumi_letter_reward(w.level), v_left);
  if v_amount > 0 then
   insert into public.hangyumi_awards(user_id, reward_day, language, canonical, event, amount, round_id)
   values (v_user, v_day, w.language, w.canonical, 'letter:' || v_char, v_amount, r.id)
   on conflict do nothing;
   get diagnostics v_inserted = row_count;
   if v_inserted = 1 then
    v_letter_paid := v_amount;
   else
    v_already := true;
   end if;
  end if;
  v_capped := v_capped or v_amount < private.hangyumi_letter_reward(w.level);

  if v_letters <@ r.guessed then
   r.status := 'won';
   v_left := greatest(0, 333 - private.hangyumi_today_earned(v_user, v_day));
   v_amount := least(private.hangyumi_word_reward(w.level), v_left);
   if v_amount > 0 then
    insert into public.hangyumi_awards(user_id, reward_day, language, canonical, event, amount, round_id)
    values (v_user, v_day, w.language, w.canonical, 'complete', v_amount, r.id)
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
     v_word_paid := v_amount;
    else
     v_already := true;
    end if;
   end if;
   v_capped := v_capped or v_amount < private.hangyumi_word_reward(w.level);
  end if;
 else
  r.misses := r.misses + 1;
  if r.misses >= 3 then r.status := 'lost'; end if;
 end if;

 if v_letter_paid + v_word_paid > 0 then
  -- Played on the page that earned it, so the ledger's own reward toast
  -- never plays it a second time.
  insert into public.yumi_energy_ledger(user_id, kind, amount, source_key, notified_at)
  values (v_user, 'game', v_letter_paid + v_word_paid,
          r.id::text || ':' || cardinality(r.guessed)::text, now());
 end if;

 update public.hangyumi_rounds
 set guessed = r.guessed, misses = r.misses, status = r.status,
     earned = earned + v_letter_paid + v_word_paid,
     finished_at = case when r.status <> 'playing' then now() end
 where id = r.id
 returning * into r;

 return private.hangyumi_round_state(r) || jsonb_build_object(
  'hit', v_hit,
  'paid', jsonb_build_object('letter', v_letter_paid, 'word', v_word_paid, 'already', v_already, 'capped', v_capped),
  'balance', (select greatest(0, coalesce(sum(amount),0)) from public.yumi_energy_ledger where user_id = v_user));
end;
$$;

create or replace function private.hangyumi_today() returns jsonb
 language plpgsql stable security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 v_day date;
 v_earned integer;
begin
 if v_user is null then
  raise exception using errcode = '42501', message = 'Authentication is required to play.';
 end if;
 v_day := public.ai_quota_local_day(v_user);
 v_earned := private.hangyumi_today_earned(v_user, v_day);
 return jsonb_build_object('day', v_day, 'earned', v_earned, 'cap', 333, 'remaining', greatest(0, 333 - v_earned),
  'reviewer', exists(select 1 from private.hangyumi_reviewers where user_id = v_user),
  'approved', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
    select language || ':' || level as k, count(*) as n from public.hangyumi_words where status = 'approved' group by 1) c));
end;
$$;

-- -------------------------------------------------------------- reviewing

create or replace function private.hangyumi_require_reviewer() returns uuid
 language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
 if v_user is null or not exists(select 1 from private.hangyumi_reviewers where user_id = v_user) then
  raise exception using errcode = '42501', message = 'Only a word reviewer can do this.';
 end if;
 return v_user;
end;
$$;

create or replace function private.hangyumi_review_words() returns jsonb
 language plpgsql stable security definer set search_path = '' as $$
begin
 perform private.hangyumi_require_reviewer();
 return (select coalesce(jsonb_agg(jsonb_build_object(
   'id', id, 'language', language, 'level', level, 'answer', answer,
   'partOfSpeech', part_of_speech, 'clues', clues, 'source', source,
   'status', status, 'reviewedAt', reviewed_at)
   order by language, level, canonical), '[]'::jsonb)
  from public.hangyumi_words);
end;
$$;

create or replace function private.hangyumi_review_set(p_ids uuid[], p_status text) returns integer
 language plpgsql volatile security definer set search_path = '' as $$
declare v_user uuid := private.hangyumi_require_reviewer(); v_count integer;
begin
 if p_status not in ('draft','approved','rejected') then
  raise exception using errcode = '22023', message = 'Unknown status.';
 end if;
 update public.hangyumi_words
 set status = p_status,
     reviewed_at = case when p_status = 'draft' then null else now() end,
     reviewed_by = case when p_status = 'draft' then null else v_user end,
     updated_at = now()
 where id = any(p_ids) and status <> p_status;
 get diagnostics v_count = row_count;
 return v_count;
end;
$$;

-- ------------------------------------------------- what the browser calls

create or replace function public.hangyumi_start(p_round_id uuid, p_language text, p_level text, p_hint_language text) returns jsonb
 language sql volatile security invoker set search_path = '' as $$
 select private.hangyumi_start(p_round_id, p_language, p_level, p_hint_language);
$$;

create or replace function public.hangyumi_guess(p_round_id uuid, p_char text) returns jsonb
 language sql volatile security invoker set search_path = '' as $$
 select private.hangyumi_guess(p_round_id, p_char);
$$;

create or replace function public.hangyumi_today() returns jsonb
 language sql stable security invoker set search_path = '' as $$
 select private.hangyumi_today();
$$;

create or replace function public.hangyumi_review_words() returns jsonb
 language sql stable security invoker set search_path = '' as $$
 select private.hangyumi_review_words();
$$;

create or replace function public.hangyumi_review_set(p_ids uuid[], p_status text) returns integer
 language sql volatile security invoker set search_path = '' as $$
 select private.hangyumi_review_set(p_ids, p_status);
$$;

revoke all on function
 private.hangyumi_letter_reward(text), private.hangyumi_word_reward(text), private.hangyumi_is_letter(text),
 private.hangyumi_today_earned(uuid, date), private.hangyumi_round_state(public.hangyumi_rounds),
 private.hangyumi_require_reviewer()
from public, anon, authenticated;

revoke all on function
 private.hangyumi_start(uuid, text, text, text), private.hangyumi_guess(uuid, text), private.hangyumi_today(),
 private.hangyumi_review_words(), private.hangyumi_review_set(uuid[], text),
 public.hangyumi_start(uuid, text, text, text), public.hangyumi_guess(uuid, text), public.hangyumi_today(),
 public.hangyumi_review_words(), public.hangyumi_review_set(uuid[], text)
from public, anon, authenticated;

grant execute on function
 private.hangyumi_start(uuid, text, text, text), private.hangyumi_guess(uuid, text), private.hangyumi_today(),
 private.hangyumi_review_words(), private.hangyumi_review_set(uuid[], text),
 public.hangyumi_start(uuid, text, text, text), public.hangyumi_guess(uuid, text), public.hangyumi_today(),
 public.hangyumi_review_words(), public.hangyumi_review_set(uuid[], text)
to authenticated;
