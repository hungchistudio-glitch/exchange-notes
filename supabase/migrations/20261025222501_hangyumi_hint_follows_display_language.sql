-- Hangyumi's clue follows the app's display language (Chi, 2026-10-26:
-- "遊戲的提示裡的語言應該是設定裡設定好的系統顯示語言"). The browser now
-- asks for the interface language rather than the native one; this lets a
-- round already in progress, picked up again after the display language
-- changed, switch its clue too instead of keeping the one it was dealt with.
--
-- Safe before the deploy: the live code sends the same hint language for a
-- round each time, so nothing it does changes.

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
