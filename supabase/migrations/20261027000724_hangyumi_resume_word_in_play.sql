-- A word in play goes on, on any device (Chi, 2026-10-26: "接續同一個字").
-- Each device keeps the round it is playing by id in its own storage, so a
-- second device, or a cleared browser, asked for a new word. In Wordvault
-- that also left the first one half-guessed and ended the streak. Now a
-- start with an id the database has not seen first looks for a word of the
-- same game, language and level still in play, and returns it; the page
-- keeps that round's id from then on. A new word is dealt only when none is
-- in play, as after "Next word", whose round is finished.
--
-- Replaces the five-argument private.hangyumi_start only; its arguments and
-- its answer are unchanged, so it is safe before the deploy (the live page
-- simply goes on with the returned round).

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
