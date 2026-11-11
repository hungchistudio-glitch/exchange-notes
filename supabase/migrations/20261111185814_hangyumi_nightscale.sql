-- Hangyumi's Nightscale｜夜鱗典藏 (Chi, 2026-11-11).
--
-- Every third word won in Hangyumi unlocks one of 24 Nightscale pieces the
-- reader does not own yet: limited, never sold, from nowhere else. Counted
-- cumulatively, like Starweaver's voyages: losing takes nothing away, and
-- the count carries across days, levels, languages and devices. The pieces
-- are a tribute told in symbols only (lib/shop/nightscaleCollection.ts).
--
-- Not safe long before the deploy, unlike Starweaver's: the live pages
-- play Hangyumi, so once this is applied a third win puts a piece in the
-- wardrobe that the live pages neither know nor show. Nothing breaks (an
-- id the catalogue does not know is ignored everywhere), but the reader
-- misses the reveal. Apply it just before the merge.

-- 1. A third pool of limited pieces.
alter table public.yumi_shop_items drop constraint if exists yumi_shop_items_reward_pool_check;
alter table public.yumi_shop_items add constraint yumi_shop_items_reward_pool_check
 check (reward_pool in ('mythic_vault','starweaver','nightscale'));

-- 2. What a finished Hangyumi word unlocked.
alter table public.hangyumi_rounds add column if not exists nightscale_reward jsonb;

-- 3. Words won and pieces unlocked, written only by private.hangyumi_guess.
create table if not exists public.nightscale_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed_total integer not null default 0 check (completed_total >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.nightscale_completions (
  round_id uuid primary key references public.hangyumi_rounds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_index integer not null check (completed_index > 0),
  created_at timestamptz not null default now(),
  unique (user_id, completed_index)
);
create table if not exists public.nightscale_awards (
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_index integer not null check (cycle_index > 0),
  item_id text not null references public.yumi_shop_items(id),
  round_id uuid not null unique references public.hangyumi_rounds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cycle_index),
  unique (user_id, item_id)
);
create index if not exists nightscale_awards_item_id_idx on public.nightscale_awards(item_id);
alter table public.nightscale_progress enable row level security;
alter table public.nightscale_completions enable row level security;
alter table public.nightscale_awards enable row level security;
revoke all on public.nightscale_progress, public.nightscale_completions, public.nightscale_awards
 from public, anon, authenticated;

-- 4. What the page shows: words won, this cycle's place in three, pieces held.
create or replace function private.nightscale_state(p_user_id uuid) returns jsonb
 language sql stable security definer set search_path = '' as $$
 with progress as (
  select coalesce((select completed_total from public.nightscale_progress where user_id = p_user_id), 0) as total
 ), pieces as (
  select
   (select count(*) from public.yumi_shop_items where reward_pool = 'nightscale')::integer as size,
   (select count(*) from public.yumi_shop_items i, public.yumi_wardrobe w
    where w.user_id = p_user_id and i.reward_pool = 'nightscale' and i.id = any(w.owned_item_ids))::integer as held
 )
 select jsonb_build_object(
  'completedTotal', progress.total,
  'cycleProgress', progress.total % 3,
  'cycleLength', 3,
  'collectedCount', pieces.held,
  'collectionSize', pieces.size,
  'collectionComplete', pieces.size > 0 and pieces.held >= pieces.size)
 from progress, pieces;
$$;
revoke all on function private.nightscale_state(uuid) from public, anon, authenticated;

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
      'award', case when p_round.status <> 'playing' then p_round.starweaver_reward -> 'award' end) end,
  -- Hangyumi: the reader's words won and Nightscale pieces held, and once
  -- the word is over, the piece it unlocked, if it was the third.
  'nightscale', case when p_round.game = 'hangyumi'
    then private.nightscale_state(p_round.user_id) || jsonb_build_object(
      'award', case when p_round.status <> 'playing' then p_round.nightscale_reward -> 'award' end) end);
end;
$$;

-- 5. The guess: as before, plus Hangyumi's every third word. Same
-- arguments, same answer, plus 'nightscale' on a Hangyumi round.
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

 -- Hangyumi: the words won, and the Nightscale piece every third unlocks.
 v_won integer;
 v_piece text;
 v_ns_reward jsonb;
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

 -- A Hangyumi word, finished (Chi, 2026-11-11). Each won round counts
 -- once (its round id is the completion's key); every third unlocks one of
 -- the 24 Nightscale pieces the reader does not own yet, each equally
 -- likely, into the wardrobe in this same transaction. A loss takes nothing
 -- away; no cookies beyond the round's own. Locks in the same order as
 -- Starweaver's: the wardrobe row (above), the round, then the progress row.
 if r.game = 'hangyumi' and r.status = 'won' then
  insert into public.nightscale_progress(user_id) values (v_user) on conflict do nothing;
  select completed_total into v_won from public.nightscale_progress where user_id = v_user for update;
  insert into public.nightscale_completions(round_id, user_id, completed_index)
  values (r.id, v_user, v_won + 1)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
   v_won := v_won + 1;
   update public.nightscale_progress set completed_total = v_won, updated_at = now() where user_id = v_user;
   if v_won % 3 = 0 then
    select i.id into v_piece
    from public.yumi_shop_items i, public.yumi_wardrobe wr
    where wr.user_id = v_user
      and i.reward_pool = 'nightscale'
      and not (i.id = any(wr.owned_item_ids))
    order by random() limit 1;
    if v_piece is not null then
     insert into public.nightscale_awards(user_id, cycle_index, item_id, round_id)
     values (v_user, v_won / 3, v_piece, r.id)
     on conflict do nothing;
     get diagnostics v_inserted = row_count;
     if v_inserted = 1 then
      update public.yumi_wardrobe
      set owned_item_ids = array_append(owned_item_ids, v_piece), updated_at = now()
      where user_id = v_user;
     else
      v_piece := null;
     end if;
    end if;
   end if;
  end if;
  v_ns_reward := jsonb_build_object(
   'completedIndex', v_won,
   'award', case when v_piece is null then null
     else jsonb_build_object('id', v_won / 3, 'itemId', v_piece) end);
 end if;

 update public.hangyumi_rounds
 set guessed = r.guessed, misses = r.misses, status = r.status,
     earned = earned + v_letter_paid + v_word_paid,
     finished_at = case when r.status <> 'playing' then now() end,
     chest_reward = coalesce(v_reward, chest_reward),
     starweaver_reward = coalesce(v_sw_reward, starweaver_reward),
     nightscale_reward = coalesce(v_ns_reward, nightscale_reward)
 where id = r.id
 returning * into r;

 return private.hangyumi_round_state(r) || jsonb_build_object(
  'hit', v_hit,
  'paid', jsonb_build_object('letter', v_letter_paid, 'word', v_word_paid, 'already', v_already, 'capped', v_capped),
  'balance', (select greatest(0, coalesce(sum(amount),0)) from public.yumi_energy_ledger where user_id = v_user));
end;
$$;

-- 6. The 24 Nightscale pieces: limited, never available, from Hangyumi
-- only. Kept equal to lib/shop/nightscaleCollection.ts by
-- tests/yumiNightscale.test.ts.
insert into public.yumi_shop_items (id, slot, price, available, limited, reward_pool) values
  ('ns-nightscale-lacquer', 'material', 333, false, true, 'nightscale'),
  ('ns-dusk-court-enamel', 'material', 333, false, true, 'nightscale'),
  ('ns-focus-slit', 'pupil', 333, false, true, 'nightscale'),
  ('ns-figure-eight-pupil', 'pupil', 333, false, true, 'nightscale'),
  ('ns-venom-gold-iris', 'iris', 333, false, true, 'nightscale'),
  ('ns-four-am-iris', 'iris', 333, false, true, 'nightscale'),
  ('ns-night-practice-goggles', 'eyewear', 333, false, true, 'nightscale'),
  ('ns-fadeaway-monocle', 'eyewear', 333, false, true, 'nightscale'),
  ('ns-four-am-headband', 'head', 333, false, true, 'nightscale'),
  ('ns-five-ring-circlet', 'head', 333, false, true, 'nightscale'),
  ('ns-warmup-collar', 'neck', 333, false, true, 'nightscale'),
  ('ns-coiled-scale-scarf', 'neck', 333, false, true, 'nightscale'),
  ('ns-seam-pin', 'pin', 333, false, true, 'nightscale'),
  ('ns-eighty-one-medal', 'pin', 333, false, true, 'nightscale'),
  ('ns-dawn-espresso', 'mouth', 333, false, true, 'nightscale'),
  ('ns-fourth-quarter-flask', 'mouth', 333, false, true, 'nightscale'),
  ('ns-four-oclock-hourglass', 'charm', 333, false, true, 'nightscale'),
  ('ns-empty-gym-key', 'charm', 333, false, true, 'nightscale'),
  ('ns-fang-drop', 'earrings', 333, false, true, 'nightscale'),
  ('ns-swish-net', 'earrings', 333, false, true, 'nightscale'),
  ('ns-scale-cuff', 'brow', 333, false, true, 'nightscale'),
  ('ns-twenty-notches', 'brow', 333, false, true, 'nightscale'),
  ('ns-coiled-serpent-chain', 'necklace', 333, false, true, 'nightscale'),
  ('ns-two-banners', 'necklace', 333, false, true, 'nightscale')
on conflict (id) do update set slot = excluded.slot, available = false, limited = true, reward_pool = 'nightscale';
