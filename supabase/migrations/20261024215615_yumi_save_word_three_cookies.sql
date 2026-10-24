-- A newly saved word earns three energy cookies instead of one (Chi,
-- 2026-10-24: "存入一個單字，改為加3個能量餅乾"). The same as before in every
-- other way: once per word and language (yumi_rewarded_words), never for a
-- word deleted and saved again. Words saved before this keep what they
-- were paid (Chi chose no back-pay). Review rounds stay at three.
--
-- Safe before the deploy: the app only reads the ledger, so the live code
-- shows +3 the moment a save pays it.
create or replace function private.yumi_award_saved_word() returns trigger
 language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
 if private.yumi_word_key(new.word) = '' then return new; end if;
 insert into public.yumi_wardrobe(user_id) values(new.user_id) on conflict do nothing;
 perform 1 from public.yumi_wardrobe where user_id=new.user_id for update;
 insert into private.yumi_rewarded_words values(new.user_id,new.word_language,private.yumi_word_key(new.word))
 on conflict do nothing;
 get diagnostics inserted_count = row_count;
 if inserted_count = 1 then
  insert into public.yumi_energy_ledger(user_id,kind,amount,source_key)
  values(new.user_id,'save',3,new.id::text);
 end if;
 return new;
end;
$$;

revoke all on function private.yumi_award_saved_word() from public, anon, authenticated;
