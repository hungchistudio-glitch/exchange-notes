-- Yumi Starweaver｜織星者, the third word game (Chi, 2026-11-10).
--
-- The same rounds, bank, keys and cookies as Hangyumi and Wordvault, and the
-- same 333 a day shared by the three; only the stage differs. Every seventh
-- word won brings back one of 17 Starwoven Relics the reader does not own,
-- which are never sold and come from nowhere else. Losing takes nothing
-- away, and the count carries across days, levels, languages and devices.
--
-- The Mythic Vault's 33 and the 17 relics are both limited, and Wordvault's
-- premium chest used to draw any limited piece. So a limited piece now says
-- where it comes from (reward_pool), the 33 are backfilled, and the chest
-- draws from 'mythic_vault' only, before the 17 rows exist: in the same
-- transaction, nothing old can draw a relic at any point.
--
-- Safe before the deploy: the live pages never start a Starweaver round,
-- every other answer is unchanged, and the new rows cannot be bought.

-- 1. Where a limited piece comes from.
alter table public.yumi_shop_items add column if not exists reward_pool text
 check (reward_pool in ('mythic_vault','starweaver'));
update public.yumi_shop_items set reward_pool = 'mythic_vault' where limited and reward_pool is null;
alter table public.yumi_shop_items drop constraint if exists yumi_shop_items_limited_pool;
alter table public.yumi_shop_items add constraint yumi_shop_items_limited_pool
 check (limited = (reward_pool is not null) and not (limited and available));

-- 2. A third game on the shared rounds, and what its finished word gave.
alter table public.hangyumi_rounds drop constraint if exists hangyumi_rounds_game_check;
alter table public.hangyumi_rounds add constraint hangyumi_rounds_game_check
 check (game in ('hangyumi','wordvault','starweaver'));
alter table public.hangyumi_rounds add column if not exists starweaver_reward jsonb;

-- 3. Voyages and relics, written only by private.hangyumi_guess.
create table if not exists public.starweaver_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_total integer not null default 0 check (completed_total >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.starweaver_completions (
  round_id uuid primary key references public.hangyumi_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_index integer not null check (completed_index > 0),
  created_at timestamptz not null default now(),
  unique (user_id, completed_index)
);
create table if not exists public.starweaver_awards (
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_index integer not null check (cycle_index > 0),
  item_id text not null references public.yumi_shop_items(id),
  round_id uuid not null unique references public.hangyumi_rounds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cycle_index),
  unique (user_id, item_id)
);
create index if not exists starweaver_awards_item_id_idx on public.starweaver_awards(item_id);
alter table public.starweaver_progress enable row level security;
alter table public.starweaver_completions enable row level security;
alter table public.starweaver_awards enable row level security;
revoke all on public.starweaver_progress, public.starweaver_completions, public.starweaver_awards
 from public, anon, authenticated;

-- 4. What the page shows: voyages, this cycle's place in seven, relics held.
create or replace function private.starweaver_state(p_user_id uuid) returns jsonb
 language sql stable security definer set search_path = '' as $$
 with progress as (
  select coalesce((select completed_total from public.starweaver_progress where user_id = p_user_id), 0) as total
 ), relics as (
  select
   (select count(*) from public.yumi_shop_items where reward_pool = 'starweaver')::integer as size,
   (select count(*) from public.yumi_shop_items i, public.yumi_wardrobe w
    where w.user_id = p_user_id and i.reward_pool = 'starweaver' and i.id = any(w.owned_item_ids))::integer as held
 )
 select jsonb_build_object(
  'completedTotal', progress.total,
  'cycleProgress', progress.total % 7,
  'cycleLength', 7,
  'collectedCount', relics.held,
  'collectionSize', relics.size,
  'collectionComplete', relics.size > 0 and relics.held >= relics.size)
 from progress, relics;
$$;
revoke all on function private.starweaver_state(uuid) from public, anon, authenticated;

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
  'chestReward', case when p_round.status <> 'playing' then p_round.chest_reward end,
  -- Starweaver: the reader's voyages and relics, and once the word is over,
  -- the relic it brought back, if it was the seventh. Never a chest.
  'starweaver', case when p_round.game = 'starweaver'
    then private.starweaver_state(p_round.user_id) || jsonb_build_object(
      'award', case when p_round.status <> 'playing' then p_round.starweaver_reward -> 'award' end) end);
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
 if p_game not in ('hangyumi','wordvault','starweaver') then
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

 -- A word of this game, language and level still in play goes on: dealt
 -- on another device, whose round id this one has never seen, or before
 -- this one's storage was cleared. A new word would have left it half-
 -- guessed, and in Wordvault ended the streak (Chi, 2026-10-26: "接續同一
 -- 個字"). The page then keeps this round's id.
 select hr.* into r
 from public.hangyumi_rounds hr join public.hangyumi_words hw on hw.id = hr.word_id
 where hr.user_id = v_user and hr.game = p_game and hr.status = 'playing'
   and hw.language = p_language and hw.level = p_level
 order by hr.created_at desc
 limit 1;
 if found then
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

-- 5. The guess: Wordvault's premium chest from the Mythic Vault only, and
-- Starweaver's voyages. Same arguments, same answer, plus 'starweaver'.
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

 -- Starweaver: the voyages completed, and the relic every seventh brings.
 v_total integer;
 v_relic text;
 v_sw_reward jsonb;
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
 -- word's whole worth again (medium, x2) or twice again (premium, x3):
 -- every letter and the word bonus, whether or not the round itself was
 -- paid (a word already paid today, or past the 333), straight to the
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
    v_bonus := (cardinality(v_letters) * private.hangyumi_letter_reward(w.level) + private.hangyumi_word_reward(w.level))
     * (case v_tier when 'medium' then 1 else 2 end);
    if v_bonus > 0 then
     insert into public.yumi_energy_ledger(user_id, kind, amount, source_key, notified_at)
     values (v_user, 'game', v_bonus, 'chest:' || r.id::text, now())
     on conflict do nothing;
    end if;
    select i.id into v_item
    from public.yumi_shop_items i, public.yumi_wardrobe wr
    where wr.user_id = v_user
      -- The Mythic Vault's 33 only: never another game's limited pieces.
      and (case when v_tier = 'premium' then i.reward_pool = 'mythic_vault'
                else not i.limited and i.available end)
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

 -- A Starweaver word, finished (Chi, 2026-11-10). Each won round is one
 -- voyage, counted once (its round id is the completion's key, so a guess
 -- sent again finds the round over and counts nothing); every seventh
 -- brings back one of the 17 Starwoven Relics the reader does not own yet,
 -- each equally likely, into the wardrobe in this same transaction. A loss
 -- takes nothing away. No cookies beyond the round's own, inside the 333.
 -- Locks: the wardrobe row (above, first, as every guess), the round, then
 -- the progress row; the same order everywhere, so two devices finishing
 -- their seventh at once wait for each other and cannot share a relic.
 if r.game = 'starweaver' and r.status = 'won' then
  insert into public.starweaver_progress(user_id) values (v_user) on conflict do nothing;
  select completed_total into v_total from public.starweaver_progress where user_id = v_user for update;
  insert into public.starweaver_completions(round_id, user_id, completed_index)
  values (r.id, v_user, v_total + 1)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
   v_total := v_total + 1;
   update public.starweaver_progress set completed_total = v_total, updated_at = now() where user_id = v_user;
   if v_total % 7 = 0 then
    select i.id into v_relic
    from public.yumi_shop_items i, public.yumi_wardrobe wr
    where wr.user_id = v_user
      and i.reward_pool = 'starweaver'
      and not (i.id = any(wr.owned_item_ids))
    order by random() limit 1;
    if v_relic is not null then
     insert into public.starweaver_awards(user_id, cycle_index, item_id, round_id)
     values (v_user, v_total / 7, v_relic, r.id)
     on conflict do nothing;
     get diagnostics v_inserted = row_count;
     if v_inserted = 1 then
      update public.yumi_wardrobe
      set owned_item_ids = array_append(owned_item_ids, v_relic), updated_at = now()
      where user_id = v_user;
     else
      v_relic := null;
     end if;
    end if;
   end if;
  end if;
  v_sw_reward := jsonb_build_object(
   'completedIndex', v_total,
   'award', case when v_relic is null then null
     else jsonb_build_object('id', v_total / 7, 'itemId', v_relic) end);
 end if;

 update public.hangyumi_rounds
 set guessed = r.guessed, misses = r.misses, status = r.status,
     earned = earned + v_letter_paid + v_word_paid,
     finished_at = case when r.status <> 'playing' then now() end,
     chest_reward = coalesce(v_reward, chest_reward),
     starweaver_reward = coalesce(v_sw_reward, starweaver_reward)
 where id = r.id
 returning * into r;

 return private.hangyumi_round_state(r) || jsonb_build_object(
  'hit', v_hit,
  'paid', jsonb_build_object('letter', v_letter_paid, 'word', v_word_paid, 'already', v_already, 'capped', v_capped),
  'balance', (select greatest(0, coalesce(sum(amount),0)) from public.yumi_energy_ledger where user_id = v_user));
end;
$$;

-- 6. The 17 Starwoven Relics: limited, never available, from Starweaver
-- only. Inserted after the chest above stopped drawing any limited piece.
-- Kept equal to lib/shop/starweaverCollection.ts by tests/yumiStarweaver.test.ts.
insert into public.yumi_shop_items (id, slot, price, available, limited, reward_pool) values
  ('sw-eventide-ceramic', 'material', 333, false, true, 'starweaver'),
  ('sw-eclipse-titanium', 'material', 333, false, true, 'starweaver'),
  ('sw-nebula-opal', 'material', 333, false, true, 'starweaver'),
  ('sw-orbit-drop', 'earrings', 333, false, true, 'starweaver'),
  ('sw-comet-thread', 'earrings', 333, false, true, 'starweaver'),
  ('sw-binary-moon', 'earrings', 333, false, true, 'starweaver'),
  ('sw-star-spindle', 'earrings', 333, false, true, 'starweaver'),
  ('sw-signal-spiral', 'earrings', 333, false, true, 'starweaver'),
  ('sw-portal-seed', 'earrings', 333, false, true, 'starweaver'),
  ('sw-meridian-cuff', 'brow', 333, false, true, 'starweaver'),
  ('sw-phase-notch', 'brow', 333, false, true, 'starweaver'),
  ('sw-zenith-pin', 'brow', 333, false, true, 'starweaver'),
  ('sw-seven-gates', 'necklace', 333, false, true, 'starweaver'),
  ('sw-stellar-compass', 'necklace', 333, false, true, 'starweaver'),
  ('sw-weavers-knot', 'necklace', 333, false, true, 'starweaver'),
  ('sw-cartographer-diadem', 'head', 333, false, true, 'starweaver'),
  ('sw-aurora-visor', 'head', 333, false, true, 'starweaver')
on conflict (id) do update set slot = excluded.slot, available = false, limited = true, reward_pool = 'starweaver';
