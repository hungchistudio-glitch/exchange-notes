-- Hangyumi's Nightscale pieces (supabase/migrations/*_hangyumi_nightscale.sql).
-- Synthetic readers and words only, and everything rolls back: safe on a
-- local database and on production.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/nightscale.sql
--
-- Any failed expectation raises, which aborts the transaction; the last
-- line printed is "nightscale: all passed" only when every check held.
begin;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'FAILED: %', what; end if;
end $$;

create function pg_temp.reader() returns uuid language plpgsql as $$
declare u uuid := gen_random_uuid();
begin
 insert into auth.users(id, email, raw_user_meta_data) values (u, u::text || '@audit.invalid', '{}'::jsonb);
 return u;
end $$;

-- A word of the reader's choosing, so the test never depends on the bank.
create function pg_temp.word(p_language text, p_answer text) returns uuid language plpgsql as $$
declare v uuid;
begin
 insert into public.hangyumi_words(language, level, answer, part_of_speech, clues, source, status)
 values (p_language, 'B1', p_answer, 'noun',
  '{"en":"audit","zh-TW":"測試","es":"prueba","fr":"essai","it":"prova"}'::jsonb, 'audit', 'approved')
 on conflict (language, canonical) do update set status = public.hangyumi_words.status
 returning id into v;
 return v;
end $$;

-- Plays one round to its end and returns the last answer: won by guessing
-- the word's letters, lost by three letters it does not have.
create function pg_temp.play(p_user uuid, p_word uuid, p_game text, p_win boolean, p_chest text default null)
returns jsonb language plpgsql as $$
declare
 v_round uuid := gen_random_uuid();
 v_answer text;
 v_out jsonb;
 ch text;
begin
 perform set_config('request.jwt.claim.sub', p_user::text, true);
 insert into public.hangyumi_rounds(id, user_id, word_id, hint_language, game, chest)
 values (v_round, p_user, p_word, 'en', p_game, p_chest);
 select answer into v_answer from public.hangyumi_words where id = p_word;
 if p_win then
  for ch in select distinct lower(c) from regexp_split_to_table(v_answer, '') c where private.hangyumi_is_letter(c) loop
   v_out := private.hangyumi_guess(v_round, ch);
  end loop;
 else
  foreach ch in array array['ж','щ','ы'] loop
   v_out := private.hangyumi_guess(v_round, ch);
  end loop;
 end if;
 return v_out;
end $$;

create function pg_temp.pieces_held(p_user uuid) returns integer language sql as $$
 select count(*)::integer from public.yumi_shop_items i, public.yumi_wardrobe w
 where w.user_id = p_user and i.reward_pool = 'nightscale' and i.id = any(w.owned_item_ids);
$$;

do $$
declare
 a uuid := pg_temp.reader();
 b uuid := pg_temp.reader();
 en uuid := pg_temp.word('en', 'qxjv');
 fr uuid := pg_temp.word('fr', 'qxjvé');
 zh uuid := pg_temp.word('zh-TW', '龘靐');
 out jsonb;
 again jsonb;
 v_round uuid;
 i integer;
 v_item text;
 v_refused boolean;
begin
 -- The pools: 333 for sale; the vault's 33, the relics' 17 and Nightscale's 24 apart.
 perform pg_temp.check((select count(*) from public.yumi_shop_items where reward_pool = 'nightscale' and limited and not available) = 24, 'nightscale is 24 limited, unbuyable');
 perform pg_temp.check((select count(*) from public.yumi_shop_items where reward_pool = 'mythic_vault' and limited and not available) = 33, 'mythic vault still 33');
 perform pg_temp.check((select count(*) from public.yumi_shop_items where reward_pool = 'starweaver' and limited and not available) = 17, 'relics still 17');
 perform pg_temp.check((select count(*) from public.yumi_shop_items where reward_pool is null and available and not limited) = 333, '333 still for sale');

 -- Every Hangyumi round says where the reader stands, from the first.
 perform set_config('request.jwt.claim.sub', a::text, true);
 out := private.hangyumi_start(gen_random_uuid(), 'en', 'B1', 'en');
 perform pg_temp.check(out ->> 'status' = 'missing' or (out -> 'nightscale' ->> 'cycleLength')::int = 3, 'a hangyumi round carries its progress');

 -- One count per won round; a lost one counts nothing and takes nothing.
 out := pg_temp.play(a, en, 'hangyumi', true);
 perform pg_temp.check(out ->> 'status' = 'won', 'won');
 perform pg_temp.check((out -> 'nightscale' ->> 'completedTotal')::int = 1 and (out -> 'nightscale' ->> 'cycleProgress')::int = 1, 'first win counted');
 perform pg_temp.check(out -> 'nightscale' -> 'award' = 'null'::jsonb, 'no piece on the first');
 perform pg_temp.check((out -> 'nightscale' ->> 'collectionSize')::int = 24, 'out of 24');
 perform pg_temp.check(out -> 'starweaver' = 'null'::jsonb and out -> 'chestReward' = 'null'::jsonb, 'never a voyage or a chest');
 out := pg_temp.play(a, en, 'hangyumi', false);
 perform pg_temp.check(out ->> 'status' = 'lost' and (out -> 'nightscale' ->> 'completedTotal')::int = 1, 'a loss neither counts nor takes away');

 -- A guess sent again to a finished round counts nothing.
 select id into v_round from public.hangyumi_rounds where user_id = a and game = 'hangyumi' and status = 'won' limit 1;
 again := private.hangyumi_guess(v_round, 'q');
 perform pg_temp.check((again ->> 'repeat')::boolean and (again -> 'nightscale' ->> 'completedTotal')::int = 1, 'resend counts nothing');

 -- The second in another language, then the third unlocks a piece.
 out := pg_temp.play(a, zh, 'hangyumi', true);
 perform pg_temp.check((out -> 'nightscale' ->> 'cycleProgress')::int = 2 and pg_temp.pieces_held(a) = 0, 'two wins, no piece yet');
 out := pg_temp.play(a, fr, 'hangyumi', true);
 v_item := out -> 'nightscale' -> 'award' ->> 'itemId';
 perform pg_temp.check(v_item is not null, 'the third unlocks a piece');
 perform pg_temp.check((select reward_pool from public.yumi_shop_items where id = v_item) = 'nightscale', 'the piece is from the nightscale pool');
 perform pg_temp.check((select v_item = any(owned_item_ids) from public.yumi_wardrobe where user_id = a), 'the piece is in the wardrobe');
 perform pg_temp.check((out -> 'nightscale' ->> 'cycleProgress')::int = 0 and (out -> 'nightscale' ->> 'collectedCount')::int = 1, 'a new cycle, one piece held');
 again := private.hangyumi_guess((out ->> 'id')::uuid, 'q');
 perform pg_temp.check(again -> 'nightscale' -> 'award' ->> 'itemId' = v_item and pg_temp.pieces_held(a) = 1, 'asked again, the same piece and no second');

 -- Owned, a piece can be worn in its slot; it can never be bought.
 perform set_config('request.jwt.claim.sub', a::text, true);
 perform private.wear_yumi_outfit(jsonb_build_object((select slot from public.yumi_shop_items where id = v_item), v_item));
 v_refused := false;
 begin
  perform private.buy_yumi_item((select id from public.yumi_shop_items where reward_pool = 'nightscale' and id <> v_item limit 1));
 exception when others then v_refused := true;
 end;
 perform pg_temp.check(v_refused, 'a nightscale piece cannot be bought');
 v_refused := false;
 begin
  perform private.wear_yumi_outfit(jsonb_build_object('head', (select id from public.yumi_shop_items where reward_pool = 'nightscale' and slot = 'head' and id <> v_item limit 1)));
 exception when others then v_refused := true;
 end;
 perform pg_temp.check(v_refused, 'a piece not unlocked cannot be worn');

 -- The other games' wins never count; Hangyumi's are never voyages or a streak.
 for i in 1..3 loop
  out := pg_temp.play(b, en, 'starweaver', true);
  perform pg_temp.check(out -> 'nightscale' = 'null'::jsonb, 'a starweaver round carries no nightscale');
 end loop;
 insert into public.wordvault_streaks(user_id, streak) values (b, 0) on conflict (user_id) do update set streak = 0;
 for i in 1..3 loop
  out := pg_temp.play(b, en, 'wordvault', true, 'normal');
 end loop;
 perform pg_temp.check(not exists (select 1 from public.nightscale_progress where user_id = b and completed_total > 0) and pg_temp.pieces_held(b) = 0, 'other games do not unlock nightscale');
 perform pg_temp.check(not exists (select 1 from public.starweaver_progress where user_id = a and completed_total > 0), 'hangyumi wins are not voyages');
 perform pg_temp.check(coalesce((select streak from public.wordvault_streaks where user_id = a), 0) = 0, 'no wordvault streak from hangyumi');

 -- Wordvault's premium chest still draws the Mythic Vault only, never Nightscale.
 for i in 1..8 loop
  update public.yumi_wardrobe set owned_item_ids = '{}' where user_id = b;
  update public.wordvault_streaks set streak = 6 where user_id = b;
  out := pg_temp.play(b, en, 'wordvault', true, 'premium');
  v_item := out -> 'chestReward' ->> 'item';
  perform pg_temp.check((select reward_pool from public.yumi_shop_items where id = v_item) = 'mythic_vault', 'premium chest from the mythic vault: ' || coalesce(v_item, 'none'));
 end loop;

 -- 72 wins hold all 24, each once; the 75th unlocks nothing more.
 for i in 4..72 loop
  out := pg_temp.play(a, case i % 3 when 0 then en when 1 then fr else zh end, 'hangyumi', true);
 end loop;
 perform pg_temp.check(pg_temp.pieces_held(a) = 24 and (out -> 'nightscale' ->> 'collectionComplete')::boolean, 'all 24 after 72');
 perform pg_temp.check((select count(distinct item_id) from public.nightscale_awards where user_id = a) = 24, 'twenty-four different pieces');
 for i in 73..75 loop
  out := pg_temp.play(a, en, 'hangyumi', true);
 end loop;
 perform pg_temp.check(out -> 'nightscale' -> 'award' = 'null'::jsonb and pg_temp.pieces_held(a) = 24
   and (select count(*) from public.nightscale_awards where user_id = a) = 24, 'nothing more once complete');
 -- Past the 333 the cookies stop, the count does not.
 perform pg_temp.check((select completed_total from public.nightscale_progress where user_id = a) = 75, '75 wins counted past the daily cap');
 perform pg_temp.check(private.hangyumi_today_earned(a, public.ai_quota_local_day(a)) <= 333, 'cookies stayed inside the 333');
end $$;

-- The reader can play but never write or read the counts directly.
set local role authenticated;
do $$
declare v_refused boolean := false;
begin
 begin
  perform 1 from public.nightscale_progress;
 exception when insufficient_privilege then v_refused := true;
 end;
 perform pg_temp.check(v_refused, 'progress is not readable by a client');
 v_refused := false;
 begin
  insert into public.nightscale_awards(user_id, cycle_index, item_id, round_id)
  values (gen_random_uuid(), 1, 'ns-fang-drop', gen_random_uuid());
 exception when insufficient_privilege then v_refused := true;
 end;
 perform pg_temp.check(v_refused, 'awards are not writable by a client');
end $$;
reset role;

select 'nightscale: all passed' as result;
rollback;
