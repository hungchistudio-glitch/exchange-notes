-- Yumi Wordvault's chests and the 33 limited pieces (Chi, 2026-10-26):
-- three wins in a row and the fourth word holds a medium chest (the round's
-- cookies twice, and a shop piece the reader does not own), six and the
-- seventh holds a premium one (three times, and one of 33 limited pieces
-- after the myths: classical mythology and legend, never what a living
-- faith holds sacred). The chest's extra cookies go to the ledger only, so
-- they sit outside the 333 a day; a loss, or a word left half-guessed,
-- ends the streak; the seventh word starts it again.
--
-- The 33 are rows in yumi_shop_items so wear_yumi_outfit takes them, but
-- `available = false` so buy_yumi_item refuses them, and `limited` sets
-- them apart from the 333 on the shelves.
--
-- Additive and safe before the deploy: the live pages call the four-
-- argument start, which still plays Hangyumi, and ignore the new keys.

alter table public.yumi_shop_items add column if not exists limited boolean not null default false;

insert into public.yumi_shop_items (id, slot, price, available, limited) values
  ('myth-olympus-marble', 'material', 333, false, true),
  ('myth-bifrost-frost', 'material', 333, false, true),
  ('myth-nile-lapis', 'material', 333, false, true),
  ('myth-sun-disk', 'pupil', 333, false, true),
  ('myth-moon-rabbit', 'pupil', 333, false, true),
  ('myth-gorgon-jade', 'iris', 333, false, true),
  ('myth-bifrost-iris', 'iris', 333, false, true),
  ('myth-ishtar-star', 'iris', 333, false, true),
  ('myth-raven-monocle', 'eyewear', 333, false, true),
  ('myth-horus-visor', 'eyewear', 333, false, true),
  ('myth-owl-spectacles', 'eyewear', 333, false, true),
  ('myth-laurel-crown', 'head', 333, false, true),
  ('myth-valkyrie-wings', 'head', 333, false, true),
  ('myth-phoenix-crown', 'head', 333, false, true),
  ('myth-golden-fleece', 'neck', 333, false, true),
  ('myth-selkie-shawl', 'neck', 333, false, true),
  ('myth-nuwa-ribbon', 'neck', 333, false, true),
  ('myth-scarab-pin', 'pin', 333, false, true),
  ('myth-triskele-pin', 'pin', 333, false, true),
  ('myth-qilin-pin', 'pin', 333, false, true),
  ('myth-ambrosia-cup', 'mouth', 333, false, true),
  ('myth-immortal-peach', 'mouth', 333, false, true),
  ('myth-mjolnir', 'charm', 333, false, true),
  ('myth-pandora-jar', 'charm', 333, false, true),
  ('myth-destiny-tablet', 'charm', 333, false, true),
  ('myth-pegasus-feather', 'earrings', 333, false, true),
  ('myth-dragon-pearl', 'earrings', 333, false, true),
  ('myth-selene-tear', 'earrings', 333, false, true),
  ('myth-hermes-wing', 'brow', 333, false, true),
  ('myth-gungnir-cuff', 'brow', 333, false, true),
  ('myth-brisingamen', 'necklace', 333, false, true),
  ('myth-lamassu-pendant', 'necklace', 333, false, true),
  ('myth-ninetail-pendant', 'necklace', 333, false, true)
on conflict (id) do update set slot = excluded.slot, available = false, limited = true;

alter table public.hangyumi_rounds add column if not exists game text not null default 'hangyumi'
 check (game in ('hangyumi','wordvault'));
alter table public.hangyumi_rounds add column if not exists chest text
 check (chest in ('normal','medium','premium'));
alter table public.hangyumi_rounds add column if not exists chest_reward jsonb;
-- A Wordvault word left half-guessed: it ends the streak once, and stays
-- playable without ending it again.
alter table public.hangyumi_rounds add column if not exists abandoned_at timestamptz;

create table if not exists public.wordvault_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak integer not null default 0 check (streak between 0 and 6),
  updated_at timestamptz not null default now()
);
alter table public.wordvault_streaks enable row level security;
revoke all on public.wordvault_streaks from public, anon, authenticated;

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
  'answer', case when p_round.status <> 'playing' then w.answer end,
  -- The word's card, like the answer only once the round is over: how it
  -- reads, and the word in each of the other four languages with theirs.
  'card', case when p_round.status <> 'playing' then w.card end,
  -- Wordvault: which game, the chest this word holds, the reader's streak,
  -- and once it is over, what the chest gave.
  'game', p_round.game,
  'chest', p_round.chest,
  'streak', case when p_round.game = 'wordvault'
    then coalesce((select s.streak from public.wordvault_streaks s where s.user_id = p_round.user_id), 0) end,
  'chestReward', case when p_round.status <> 'playing' then p_round.chest_reward end);
end;
$$;

create or replace function private.hangyumi_start(p_round_id uuid, p_language text, p_level text, p_hint_language text, p_game text) returns jsonb
 language plpgsql volatile security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 r public.hangyumi_rounds;
 w public.hangyumi_words;
 v_keyboard text[];
 v_answer_chars text[];
 v_distractors text[];
 v_streak integer;
 v_chest text;
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
 if p_game not in ('hangyumi','wordvault') then
  raise exception using errcode = '22023', message = 'Unknown game.';
 end if;

 select * into r from public.hangyumi_rounds hr where hr.id = p_round_id;
 if found then
  if r.user_id <> v_user then
   raise exception using errcode = '42501', message = 'That round is not yours.';
  end if;
  -- Picked up again after the display language changed: the clue follows.
  if r.hint_language <> p_hint_language then
   update public.hangyumi_rounds set hint_language = p_hint_language where id = r.id returning * into r;
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

 -- Wordvault: a word left half-guessed for another language or level ends
 -- the streak (Chi: "中途換語言／難度放棄都歸零"); then the chest this word
 -- holds follows from the streak: the fourth word in a row a medium one,
 -- the seventh a premium one.
 if p_game = 'wordvault' then
  insert into public.wordvault_streaks(user_id) values (v_user) on conflict do nothing;
  select streak into v_streak from public.wordvault_streaks where user_id = v_user for update;
  if (exists (
   select 1 from public.hangyumi_rounds o
   where o.user_id = v_user and o.game = 'wordvault' and o.status = 'playing'
     and cardinality(o.guessed) > 0 and o.abandoned_at is null and o.id <> p_round_id
  )) then
   update public.hangyumi_rounds hr set chest = 'normal', abandoned_at = now()
   where hr.user_id = v_user and hr.game = 'wordvault' and hr.status = 'playing'
     and cardinality(hr.guessed) > 0 and hr.abandoned_at is null and hr.id <> p_round_id;
   v_streak := 0;
   update public.wordvault_streaks set streak = 0, updated_at = now() where user_id = v_user;
  end if;
  v_chest := case v_streak when 3 then 'medium' when 6 then 'premium' else 'normal' end;
 end if;

 insert into public.hangyumi_rounds(id, user_id, word_id, hint_language, keyboard, game, chest)
 values (p_round_id, v_user, w.id, p_hint_language, v_keyboard, p_game, v_chest)
 on conflict (id) do nothing;

 select * into r from public.hangyumi_rounds hr where hr.id = p_round_id;
 if r.user_id <> v_user then
  raise exception using errcode = '42501', message = 'That round is not yours.';
 end if;
 return private.hangyumi_round_state(r);
end;
$$;

-- The four-argument start the live pages call: Hangyumi.
create or replace function private.hangyumi_start(p_round_id uuid, p_language text, p_level text, p_hint_language text) returns jsonb
 language sql volatile security definer set search_path = '' as $$
 select private.hangyumi_start(p_round_id, p_language, p_level, p_hint_language, 'hangyumi');
$$;

create or replace function public.hangyumi_start(p_round_id uuid, p_language text, p_level text, p_hint_language text, p_game text) returns jsonb
 language sql volatile security invoker set search_path = '' as $$
 select private.hangyumi_start(p_round_id, p_language, p_level, p_hint_language, p_game);
$$;

revoke all on function
 private.hangyumi_start(uuid, text, text, text, text), public.hangyumi_start(uuid, text, text, text, text)
from public, anon, authenticated;
grant execute on function
 private.hangyumi_start(uuid, text, text, text, text), public.hangyumi_start(uuid, text, text, text, text)
to authenticated;

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

 -- Wordvault: the streak, and the chest a finished word opens.
 v_streak integer;
 v_tier text;
 v_bonus integer := 0;
 v_item text;
 v_reward jsonb;
begin
 if v_user is null then
  raise exception using errcode = '42501', message = 'Authentication is required to play.';
 end if;

 -- Every guess by this reader, in every round and on every device, waits
 -- here for the one before it, so two cannot both read the same "left today".
 insert into public.yumi_wardrobe(user_id) values (v_user) on conflict do nothing;
 perform 1 from public.yumi_wardrobe where user_id = v_user for update;

 select * into r from public.hangyumi_rounds hr where hr.id = p_round_id and hr.user_id = v_user for update;
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

 -- A Wordvault word, finished. Won at the right streak, its chest pays the
 -- round again (medium, x2) or twice again (premium, x3), straight to the
 -- ledger and so outside today's 333, and gives a piece the reader does not
 -- own yet: from the shop for a medium chest, from the 33 limited pieces
 -- for a premium one. A loss ends the streak; the seventh word starts it
 -- again. The wardrobe row is already locked, above.
 if r.game = 'wordvault' and r.status <> 'playing' then
  insert into public.wordvault_streaks(user_id) values (v_user) on conflict do nothing;
  select streak into v_streak from public.wordvault_streaks where user_id = v_user for update;
  if r.status = 'won' then
   v_tier := case
    when r.chest = 'medium' and v_streak = 3 then 'medium'
    when r.chest = 'premium' and v_streak = 6 then 'premium'
    else 'normal' end;
   if v_tier <> 'normal' then
    v_bonus := (r.earned + v_letter_paid + v_word_paid) * (case v_tier when 'medium' then 1 else 2 end);
    if v_bonus > 0 then
     insert into public.yumi_energy_ledger(user_id, kind, amount, source_key, notified_at)
     values (v_user, 'game', v_bonus, 'chest:' || r.id::text, now())
     on conflict do nothing;
    end if;
    select i.id into v_item
    from public.yumi_shop_items i, public.yumi_wardrobe wr
    where wr.user_id = v_user
      and i.limited = (v_tier = 'premium')
      and (v_tier = 'premium' or i.available)
      and not (i.id = any(wr.owned_item_ids))
    order by random() limit 1;
    if v_item is not null then
     update public.yumi_wardrobe
     set owned_item_ids = array_append(owned_item_ids, v_item), updated_at = now()
     where user_id = v_user;
    end if;
   end if;
   v_reward := jsonb_build_object('tier', v_tier, 'cookies', v_bonus, 'item', v_item, 'limited', v_tier = 'premium' and v_item is not null);
   v_streak := v_streak + 1;
   if v_streak >= 7 then v_streak := 0; end if;
  else
   v_reward := jsonb_build_object('tier', coalesce(r.chest, 'normal'), 'cookies', 0, 'item', null, 'limited', false);
   v_streak := 0;
  end if;
  update public.wordvault_streaks set streak = v_streak, updated_at = now() where user_id = v_user;
 end if;

 update public.hangyumi_rounds
 set guessed = r.guessed, misses = r.misses, status = r.status,
     earned = earned + v_letter_paid + v_word_paid,
     finished_at = case when r.status <> 'playing' then now() end,
     chest_reward = coalesce(v_reward, chest_reward)
 where id = r.id
 returning * into r;

 return private.hangyumi_round_state(r) || jsonb_build_object(
  'hit', v_hit,
  'paid', jsonb_build_object('letter', v_letter_paid, 'word', v_word_paid, 'already', v_already, 'capped', v_capped),
  'balance', (select greatest(0, coalesce(sum(amount),0)) from public.yumi_energy_ledger where user_id = v_user));
end;
$$;
