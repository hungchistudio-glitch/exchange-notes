-- The games hub's progress row (supabase/migrations/*_games_progress.sql).
-- Synthetic readers and words only, and everything rolls back: safe on a
-- local database and on production.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/games_progress.sql
--
-- Any failed expectation raises, which aborts the transaction; the last
-- line printed is "games_progress: all passed" only when every check held.
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

-- Plays one round to its end, won by guessing the word's letters.
create function pg_temp.win(p_user uuid, p_word uuid, p_game text, p_chest text default null)
returns void language plpgsql as $$
declare
 v_round uuid := gen_random_uuid();
 v_answer text;
 ch text;
begin
 perform set_config('request.jwt.claim.sub', p_user::text, true);
 insert into public.hangyumi_rounds(id, user_id, word_id, hint_language, game, chest)
 values (v_round, p_user, p_word, 'en', p_game, p_chest);
 select answer into v_answer from public.hangyumi_words where id = p_word;
 for ch in select distinct lower(c) from regexp_split_to_table(v_answer, '') c where private.hangyumi_is_letter(c) loop
  perform private.hangyumi_guess(v_round, ch);
 end loop;
end $$;

-- What the hub is told, as the signed-in reader.
create function pg_temp.progress(p_user uuid) returns jsonb language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub', p_user::text, true);
 return public.games_progress();
end $$;

do $$
declare
 a uuid := pg_temp.reader();
 b uuid := pg_temp.reader();
 en uuid := pg_temp.word('en', 'qxjv');
 p jsonb;
begin
 -- A new reader: nothing yet, every collection's size from the shop.
 p := pg_temp.progress(a);
 perform pg_temp.check((p -> 'hangyumi' ->> 'cycleProgress')::int = 0 and (p -> 'hangyumi' ->> 'cycleLength')::int = 3
   and (p -> 'hangyumi' ->> 'collectedCount')::int = 0 and (p -> 'hangyumi' ->> 'collectionSize')::int = 24, 'hangyumi starts empty of 24');
 perform pg_temp.check((p -> 'starweaver' ->> 'cycleProgress')::int = 0 and (p -> 'starweaver' ->> 'cycleLength')::int = 7
   and (p -> 'starweaver' ->> 'collectedCount')::int = 0 and (p -> 'starweaver' ->> 'collectionSize')::int = 17, 'starweaver starts empty of 17');
 perform pg_temp.check((p -> 'wordvault' ->> 'streak')::int = 0 and (p -> 'wordvault' ->> 'streakLength')::int = 7, 'wordvault streak starts at 0 of 7');

 -- Two Hangyumi wins: two of three, no piece yet.
 perform pg_temp.win(a, en, 'hangyumi');
 perform pg_temp.win(a, en, 'hangyumi');
 p := pg_temp.progress(a);
 perform pg_temp.check((p -> 'hangyumi' ->> 'cycleProgress')::int = 2 and (p -> 'hangyumi' ->> 'collectedCount')::int = 0, 'two of three');
 -- The third: a piece, and the cycle starts again.
 perform pg_temp.win(a, en, 'hangyumi');
 p := pg_temp.progress(a);
 perform pg_temp.check((p -> 'hangyumi' ->> 'cycleProgress')::int = 0 and (p -> 'hangyumi' ->> 'collectedCount')::int = 1, 'third win, one piece');

 -- Starweaver: three voyages of seven.
 for i in 1..3 loop perform pg_temp.win(a, en, 'starweaver'); end loop;
 p := pg_temp.progress(a);
 perform pg_temp.check((p -> 'starweaver' ->> 'cycleProgress')::int = 3 and (p -> 'starweaver' ->> 'collectedCount')::int = 0, 'three voyages of seven');

 -- Wordvault: two words won in a row.
 perform pg_temp.win(a, en, 'wordvault');
 perform pg_temp.win(a, en, 'wordvault');
 p := pg_temp.progress(a);
 perform pg_temp.check((p -> 'wordvault' ->> 'streak')::int = 2, 'a streak of two');

 -- Another reader sees only their own.
 p := pg_temp.progress(b);
 perform pg_temp.check((p -> 'hangyumi' ->> 'collectedCount')::int = 0 and (p -> 'starweaver' ->> 'cycleProgress')::int = 0
   and (p -> 'wordvault' ->> 'streak')::int = 0, 'another reader starts from nothing');
 -- Kept for the signed-in client below, which cannot read auth.users.
 perform set_config('audit.reader', a::text, true);
end $$;

-- Signed out: refused.
do $$
declare v_refused boolean := false;
begin
 perform set_config('request.jwt.claim.sub', '', true);
 begin
  perform private.games_progress();
 exception when insufficient_privilege then v_refused := true;
 end;
 perform pg_temp.check(v_refused, 'no reader, no progress');
end $$;

-- A signed-in client may call it; an anonymous one may not.
set local role authenticated;
do $$
begin
 perform set_config('request.jwt.claim.sub', current_setting('audit.reader'), true);
 perform pg_temp.check(public.games_progress() ? 'wordvault', 'callable when signed in');
end $$;
reset role;
set local role anon;
do $$
declare v_refused boolean := false;
begin
 begin
  perform public.games_progress();
 exception when insufficient_privilege then v_refused := true;
 end;
 perform pg_temp.check(v_refused, 'not callable signed out');
end $$;
reset role;

select 'games_progress: all passed' as result;
rollback;
