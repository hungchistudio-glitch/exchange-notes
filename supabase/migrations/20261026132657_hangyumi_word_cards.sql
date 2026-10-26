-- Hangyumi's word card, filled in ahead (Chi, 2026-10-26: "下面的字卡應該對應
-- 的是設定的系統語言翻譯，而不是單字意思", and the readings complete in all
-- five languages). Each word keeps its reading (IPA, or pinyin and zhuyin)
-- and the word in the other four languages, each with its own reading,
-- written in supabase/hangyumi/cards/ and seeded by scripts/hangyumi-seed.mjs.
-- The card used to be a live translation, which fell back to the clue
-- whenever the day's translations were spent.
--
-- Additive and safe before the deploy: the live code ignores the new key,
-- and like the answer it is sent only once a round is over.

alter table public.hangyumi_words add column if not exists card jsonb;

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
  'card', case when p_round.status <> 'playing' then w.card end);
end;
$$;
