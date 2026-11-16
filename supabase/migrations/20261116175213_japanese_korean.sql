-- Japanese and Korean (Chi, 2026-11-16): seven languages on both axes.
--
-- Additive only, so it can go in before the code that uses it: every check
-- below accepts what it accepted before, plus 'ja' and 'ko'. Nothing here
-- tightens anything — `hangyumi_words.clues` still requires the original
-- five clues and no more, so the bank of 1,200 words stays valid while
-- Japanese and Korean clues are written; a missing clue falls back to the
-- English one (private.hangyumi_round_state already does that).
--
-- Also: Hangyumi deals Japanese and Korean the way it deals Chinese, with
-- sixteen tiles (the answer's characters and decoys from other words of the
-- language; Chi: Korean tiles are whole syllable blocks), and a hello can be
-- filled in Japanese and Korean.

begin;

alter table public.profiles
  drop constraint if exists profiles_native_language_check,
  add constraint profiles_native_language_check
    check (native_language is null or native_language in ('en','zh-TW','es','fr','it','ja','ko')),
  drop constraint if exists profiles_learning_language_check,
  add constraint profiles_learning_language_check
    check (learning_language is null or learning_language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_language_check,
  add constraint vocabulary_items_language_check
    check (language in ('english','traditional-chinese','en','zh-TW','es','fr','it','ja','ko')),
  drop constraint if exists vocabulary_items_word_language_check,
  add constraint vocabulary_items_word_language_check
    check (word_language in ('en','zh-TW','es','fr','it','ja','ko')),
  drop constraint if exists vocabulary_items_translation_language_check,
  add constraint vocabulary_items_translation_language_check
    check (translation_language in ('en','zh-TW','es','fr','it','ja','ko')),
  drop constraint if exists vocabulary_items_language_pair_check,
  add constraint vocabulary_items_language_pair_check
    check (
      language_pair_at_creation is null or (
        jsonb_typeof(language_pair_at_creation) = 'object'
        and language_pair_at_creation ? 'primary'
        and language_pair_at_creation ? 'secondary'
        and (language_pair_at_creation ->> 'primary') = any (array['en','zh-TW','es','fr','it','ja','ko'])
        and (language_pair_at_creation ->> 'secondary') = any (array['en','zh-TW','es','fr','it','ja','ko'])
        and octet_length(language_pair_at_creation::text) <= 128
      )
    );

alter table public.detected_phrases
  drop constraint if exists detected_phrases_language_pair_check,
  add constraint detected_phrases_language_pair_check
    check (learning_language in ('en','zh-TW','es','fr','it','ja','ko') and native_language in ('en','zh-TW','es','fr','it','ja','ko') and learning_language <> native_language);

alter table public.message_language_analysis
  drop constraint if exists message_language_analysis_language_pair_check,
  add constraint message_language_analysis_language_pair_check
    check (learning_language in ('en','zh-TW','es','fr','it','ja','ko') and native_language in ('en','zh-TW','es','fr','it','ja','ko') and learning_language <> native_language);

alter table public.notes
  drop constraint if exists notes_original_language_check,
  add constraint notes_original_language_check
    check (original_language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.note_interpretations
  drop constraint if exists note_interpretations_target_language_check,
  add constraint note_interpretations_target_language_check
    check (target_language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.pronunciation_attempts
  drop constraint if exists pronunciation_attempts_language_check,
  add constraint pronunciation_attempts_language_check
    check (language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.pronunciation_progress
  drop constraint if exists pronunciation_progress_language_check,
  add constraint pronunciation_progress_language_check
    check (language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.pronunciation_sessions
  drop constraint if exists pronunciation_sessions_language_check,
  add constraint pronunciation_sessions_language_check
    check (language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.hangyumi_words
  drop constraint if exists hangyumi_words_language_check,
  add constraint hangyumi_words_language_check
    check (language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.hangyumi_rounds
  drop constraint if exists hangyumi_rounds_hint_language_check,
  add constraint hangyumi_rounds_hint_language_check
    check (hint_language in ('en','zh-TW','es','fr','it','ja','ko'));

alter table public.yumi_hellos
  drop constraint if exists yumi_hellos_pair_check,
  add constraint yumi_hellos_pair_check
    check (array_length(pair, 1) = 2 and pair[1] <> pair[2] and pair <@ array['en','zh-TW','es','fr','it','ja','ko']),
  drop constraint if exists yumi_hellos_source_language_check,
  add constraint yumi_hellos_source_language_check
    check (source_language in ('en','zh-TW','es','fr','it','ja','ko'));

-- A hello's missing side can now be Japanese or Korean.
create or replace function public.claim_yumi_hello_fill(p_id text, p_language text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_hello public.yumi_hellos;
begin
  if p_language not in ('en','zh-TW','es','fr','it','ja','ko') then
    return null;
  end if;

  update public.yumi_hellos
  set fill_attempts = fill_attempts + 1,
      last_fill_at = pg_catalog.now()
  where id = p_id
    and revoked_at is null
    and not (sense ? p_language)
    and fill_attempts < 3
    and (last_fill_at is null or last_fill_at < pg_catalog.now() - interval '1 minute')
  returning * into v_hello;

  if v_hello.id is null then
    return null;
  end if;

  return pg_catalog.jsonb_build_object(
    'pair', pg_catalog.to_jsonb(v_hello.pair),
    'source', v_hello.source_language,
    'sense', v_hello.sense
  );
end;
$function$;

create or replace function public.fill_yumi_hello_language(p_id text, p_language text, p_side jsonb)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if p_language not in ('en','zh-TW','es','fr','it','ja','ko') or pg_catalog.jsonb_typeof(p_side) <> 'object' then
    return false;
  end if;

  update public.yumi_hellos
  set sense = sense || pg_catalog.jsonb_build_object(p_language, p_side)
  where id = p_id and revoked_at is null and not (sense ? p_language);

  return found;
end;
$function$;

-- Hangyumi, Wordvault and Starweaver deal Japanese and Korean as tiles.
create or replace function private.hangyumi_start(p_round_id uuid, p_language text, p_level text, p_hint_language text, p_game text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
 v_user uuid := auth.uid();
 r public.hangyumi_rounds;
 w public.hangyumi_words;
 v_keyboard text[];
 v_answer_chars text[];
 v_distractors text[];
 v_fallback text;
 v_streak integer;
 v_chest text;
begin
 if v_user is null then
  raise exception using errcode = '42501', message = 'Authentication is required to play.';
 end if;
 if p_language not in ('en','zh-TW','es','fr','it','ja','ko') or p_hint_language not in ('en','zh-TW','es','fr','it','ja','ko') then
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

 -- Chinese, Japanese and Korean are guessed from sixteen tiles: the
 -- answer's characters (kana, kanji, or Korean syllable blocks; Chi,
 -- 2026-11-16) and decoys from the language's other approved words, so a
 -- wrong key is a real word's character too, not noise.
 if w.language in ('zh-TW','ja','ko') then
  v_fallback := case w.language
   when 'ja' then 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもらりるれろ'
   when 'ko' then '가나다라마바사아자차카타파하고노도로모보소오조호구누두루무부수우주'
   else '山海光日月星雲風心學文天地時人路城夜雨花'
  end;
  select array_agg(distinct ch) into v_answer_chars
  from regexp_split_to_table(w.answer, '') ch where private.hangyumi_is_letter(ch);
  select array_agg(ch) into v_distractors from (
   select ch from (
    select distinct ch from public.hangyumi_words o, regexp_split_to_table(o.answer, '') ch
    where o.language = w.language and o.status = 'approved' and o.id <> w.id
      and private.hangyumi_is_letter(ch) and ch <> all(v_answer_chars)
   ) pool order by random() limit greatest(0, 16 - cardinality(v_answer_chars))
  ) picked;
  v_distractors := coalesce(v_distractors, '{}');
  if cardinality(v_answer_chars) + cardinality(v_distractors) < 16 then
   select v_distractors || coalesce(array_agg(ch), '{}') into v_distractors from (
    select ch from regexp_split_to_table(v_fallback, '') ch
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
$function$;

-- Say so where the schema is read: the app is seven languages, on both axes.
comment on table public.profiles is
  'One row per reader. Exchange Notes is a seven-language app: English, 繁體中文, Español, Français, Italiano, 日本語 and 한국어 (en, zh-TW, es, fr, it, ja, ko), any of them as the interface (app_preferences), the language learned, or the one already spoken.';
comment on column public.profiles.native_language is
  'BCP-47 code of the language the reader already speaks, one of the seven: en, zh-TW, es, fr, it, ja, ko. Was a prose encoding until 2026-08.';
comment on column public.profiles.learning_language is
  'BCP-47 code of the language the reader is learning, one of the seven: en, zh-TW, es, fr, it, ja, ko.';
comment on column public.word_phonetics.ipa is
  'The word''s reading: IPA for en, es, fr and it; for ja, the hiragana reading, from which furigana and romaji are made. zh-TW (zhuyin, pinyin) and ko (romanization, IPA) are read by rule in the app and not stored here.';
comment on column public.hangyumi_words.language is
  'The language the word is dealt in, one of the seven. zh-TW, ja and ko are played with sixteen tiles (Korean tiles are whole syllable blocks); the others with a keyboard.';

commit;
