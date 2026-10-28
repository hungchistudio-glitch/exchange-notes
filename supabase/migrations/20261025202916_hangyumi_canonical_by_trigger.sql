-- Hangyumi's word key, set by a trigger instead of a generated column
-- (2026-10-25). A generated column calls private.yumi_word_key as whoever
-- writes the row, and the service role that seeds the bank
-- (scripts/hangyumi-seed.mjs) has no way into the private schema, nor
-- should it be given one. A trigger runs with its owner's rights, as
-- yumi_award_saved_word already does, so the key is still always
-- private.yumi_word_key(answer) and still impossible to write by hand.
--
-- Safe at any time: the table holds no rows yet, and nothing reads the
-- column differently.

alter table public.hangyumi_words alter column canonical drop expression;

create or replace function private.hangyumi_words_canonical() returns trigger
 language plpgsql security definer set search_path = '' as $$
begin
 new.canonical := private.yumi_word_key(new.answer);
 return new;
end;
$$;

revoke all on function private.hangyumi_words_canonical() from public, anon, authenticated;

drop trigger if exists hangyumi_words_canonical on public.hangyumi_words;
create trigger hangyumi_words_canonical
 before insert or update of answer, canonical on public.hangyumi_words
 for each row execute function private.hangyumi_words_canonical();
