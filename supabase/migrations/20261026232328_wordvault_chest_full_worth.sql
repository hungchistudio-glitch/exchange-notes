-- A Wordvault chest always holds cookies (Chi, 2026-10-26: "照這個字的完整
-- 價值算"). It paid a multiple of what the round itself was paid, so a word
-- already paid today, or one played past the 333, opened a medium or
-- premium chest with no cookies in it. It now pays a multiple of the word's
-- whole worth: every distinct letter (or character) at the level's letter
-- reward, and the word bonus. Still to the ledger only, outside the 333.
--
-- Replaces private.hangyumi_guess and nothing else; its arguments and what
-- it returns are unchanged, so it is safe before the deploy.

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
