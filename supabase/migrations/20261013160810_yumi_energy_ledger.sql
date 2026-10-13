-- Independent shop currency. No paid credit path is enabled by this migration.
-- Opening entries preserve each reader's current spendable balance and wardrobe.
-- All later awards and spends are immutable ledger entries; vocabulary deletion
-- cannot reduce the balance. Run as one migration transaction.
lock table public.vocabulary_items in share row exclusive mode;
lock table public.yumi_wardrobe in share row exclusive mode;

create table public.yumi_energy_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('opening','save','review','purchase','paid','refund')),
 amount integer not null,
 source_key text not null,
 created_at timestamptz not null default clock_timestamp(),
 notified_at timestamptz,
 unique(user_id, kind, source_key),
 check ((kind in ('opening','save','review','paid') and amount >= 0)
     or (kind = 'purchase' and amount < 0) or kind = 'refund')
);
alter table public.yumi_energy_ledger enable row level security;
revoke all on public.yumi_energy_ledger from public, anon, authenticated;
grant select on public.yumi_energy_ledger to authenticated;
create policy energy_owner_read on public.yumi_energy_ledger for select to authenticated
 using ((select auth.uid()) = user_id);
create index energy_unread on public.yumi_energy_ledger(user_id, created_at)
 where notified_at is null and kind in ('save','review','paid');

-- Durable identities survive deletion of the vocabulary row.
create table private.yumi_rewarded_words (
 user_id uuid not null references auth.users(id) on delete cascade,
 language text not null,
 word_key text not null,
 primary key(user_id,language,word_key)
);
revoke all on private.yumi_rewarded_words from public, anon, authenticated;

create function private.yumi_word_key(p_word text) returns text
 language sql immutable set search_path = '' as $$
 select lower(regexp_replace(btrim(normalize(p_word, NFC)), '\s+', ' ', 'g'));
$$;
revoke all on function private.yumi_word_key(text) from public, anon, authenticated;

insert into public.yumi_energy_ledger(user_id,kind,amount,source_key,notified_at)
select users.id, 'opening', greatest(0, count(v.id)::integer - coalesce(w.cookies_spent,0)),
 'legacy-v1', now()
from auth.users users
left join public.vocabulary_items v on v.user_id=users.id
left join public.yumi_wardrobe w on w.user_id=users.id
group by users.id,w.cookies_spent;
insert into private.yumi_rewarded_words(user_id,language,word_key)
select distinct user_id,word_language,private.yumi_word_key(word)
from public.vocabulary_items on conflict do nothing;

create function private.yumi_award_saved_word() returns trigger
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
  values(new.user_id,'save',1,new.id::text);
 end if;
 return new;
end;
$$;
revoke all on function private.yumi_award_saved_word() from public, anon, authenticated;
create trigger yumi_saved_word_credit after insert on public.vocabulary_items
 for each row execute function private.yumi_award_saved_word();

create or replace function private.yumi_wardrobe_state(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
 'earned', coalesce(sum(l.amount) filter(where l.kind in ('opening','save','review')),0),
 'paid', coalesce(sum(l.amount) filter(where l.kind='paid'),0),
 'spent', coalesce(w.cookies_spent,0),
 'balance', greatest(0,coalesce(sum(l.amount),0)),
 'owned', coalesce(to_jsonb(w.owned_item_ids),'[]'::jsonb),
 'outfit', coalesce(w.outfit,'{}'::jsonb))
 from (select p_user_id as id) u
 left join public.yumi_energy_ledger l on l.user_id=u.id
 left join public.yumi_wardrobe w on w.user_id=u.id
 group by w.cookies_spent,w.owned_item_ids,w.outfit;
$$;
create or replace function private.buy_yumi_item(p_item_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_wardrobe public.yumi_wardrobe%rowtype;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to buy.';
  end if;

  select item.price
  into v_price
  from public.yumi_shop_items as item
  where item.id = p_item_id
    and item.available;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'That piece is not in the shop.';
  end if;

  insert into public.yumi_wardrobe (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  -- Serialises every purchase by this reader: a second one waits here and
  -- then reads what the first one spent.
  select wardrobe.*
  into v_wardrobe
  from public.yumi_wardrobe as wardrobe
  where wardrobe.user_id = v_user_id
  for update;

  if p_item_id = any(v_wardrobe.owned_item_ids) then
    return pg_catalog.jsonb_build_object(
      'status', 'owned',
      'state', private.yumi_wardrobe_state(v_user_id)
    );
  end if;

  if (select coalesce(sum(amount),0) from public.yumi_energy_ledger where user_id=v_user_id) < v_price then
    return pg_catalog.jsonb_build_object(
      'status', 'insufficient',
      'state', private.yumi_wardrobe_state(v_user_id)
    );
  end if;

  insert into public.yumi_energy_ledger(user_id,kind,amount,source_key,notified_at)
  values(v_user_id,'purchase',-v_price,p_item_id,now());

  update public.yumi_wardrobe
  set owned_item_ids = pg_catalog.array_append(owned_item_ids, p_item_id),
      cookies_spent = cookies_spent + v_price,
      updated_at = now()
  where user_id = v_user_id;

  return pg_catalog.jsonb_build_object(
    'status', 'bought',
    'state', private.yumi_wardrobe_state(v_user_id)
  );
end;
$$;


-- A review round is a server-owned immutable queue. Each card receives one
-- recorded grade. Retries return the same result and cannot create awards.
create table private.yumi_review_rounds (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz
);
create table private.yumi_review_round_cards (
 round_id uuid not null references private.yumi_review_rounds(id) on delete cascade,
 item_id uuid not null,
 grade text check(grade in ('again','hard','good','easy')),
 result jsonb,
 primary key(round_id,item_id)
);
revoke all on private.yumi_review_rounds,private.yumi_review_round_cards from public, anon, authenticated;

create function private.begin_yumi_review_round(p_round_id uuid,p_item_ids uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); ids uuid[]; existing_ids uuid[];
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select array_agg(distinct x order by x) into ids from unnest(p_item_ids) x;
 if p_round_id is null or coalesce(cardinality(ids),0)=0 or cardinality(ids)>10000 then
  raise exception 'Invalid review queue' using errcode='22023';
 end if;
 if exists(select 1 from unnest(ids) x where not exists(
  select 1 from public.vocabulary_items v where v.id=x and v.user_id=uid)) then
  raise exception 'Review queue contains unavailable words' using errcode='42501';
 end if;
 insert into private.yumi_review_rounds(id,user_id) values(p_round_id,uid) on conflict do nothing;
 perform 1 from private.yumi_review_rounds where id=p_round_id and user_id=uid for update;
 if not found then raise exception 'Round unavailable' using errcode='42501'; end if;
 select array_agg(item_id order by item_id) into existing_ids from private.yumi_review_round_cards where round_id=p_round_id;
 if existing_ids is not null and existing_ids<>ids then
  raise exception 'A review queue cannot be changed' using errcode='22023';
 end if;
 insert into private.yumi_review_round_cards(round_id,item_id)
 select p_round_id,x from unnest(ids) x on conflict do nothing;
 return p_round_id;
end;
$$;

create function private.grade_yumi_review_round(p_round_id uuid,p_item_id uuid,p_grade text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); cached jsonb; v_result jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform 1 from private.yumi_review_rounds where id=p_round_id and user_id=uid for update;
 if not found then raise exception 'Round unavailable' using errcode='42501'; end if;
 select c.result into cached from private.yumi_review_round_cards c where round_id=p_round_id and item_id=p_item_id;
 if not found then raise exception 'Word outside this round' using errcode='42501'; end if;
 if cached is not null then return cached; end if;
 v_result:=private.apply_review_result_atomic(p_item_id,p_grade);
 update private.yumi_review_round_cards set grade=p_grade,result=v_result where round_id=p_round_id and item_id=p_item_id;
 if not exists(select 1 from private.yumi_review_round_cards where round_id=p_round_id and grade is null) then
  update private.yumi_review_rounds set completed_at=clock_timestamp() where id=p_round_id;
  if not exists(select 1 from private.yumi_review_round_cards where round_id=p_round_id and grade='again') then
   insert into public.yumi_wardrobe(user_id) values(uid) on conflict do nothing;
   perform 1 from public.yumi_wardrobe where user_id=uid for update;
   insert into public.yumi_energy_ledger(user_id,kind,amount,source_key)
   values(uid,'review',3,p_round_id::text) on conflict do nothing;
  end if;
 end if;
 return v_result;
end;
$$;

create function public.begin_yumi_review_round(p_round_id uuid,p_item_ids uuid[]) returns uuid
language sql security invoker set search_path = '' as $$
 select private.begin_yumi_review_round(p_round_id,p_item_ids);
$$;
create function public.grade_yumi_review_round(p_round_id uuid,p_item_id uuid,p_grade text) returns jsonb
language sql security invoker set search_path = '' as $$
 select private.grade_yumi_review_round(p_round_id,p_item_id,p_grade);
$$;
revoke all on function private.begin_yumi_review_round(uuid,uuid[]),private.grade_yumi_review_round(uuid,uuid,text),public.begin_yumi_review_round(uuid,uuid[]),public.grade_yumi_review_round(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.begin_yumi_review_round(uuid,uuid[]),private.grade_yumi_review_round(uuid,uuid,text),public.begin_yumi_review_round(uuid,uuid[]),public.grade_yumi_review_round(uuid,uuid,text) to authenticated;

create function private.ack_yumi_energy(p_ids uuid[]) returns void language sql security definer set search_path='' as $$
 update public.yumi_energy_ledger set notified_at=clock_timestamp()
 where user_id=auth.uid() and id=any(p_ids) and notified_at is null;
$$;
create function public.ack_yumi_energy(p_ids uuid[]) returns void language sql security invoker set search_path='' as $$
 select private.ack_yumi_energy(p_ids);
$$;
revoke all on function private.ack_yumi_energy(uuid[]),public.ack_yumi_energy(uuid[]) from public,anon,authenticated;
grant execute on function private.ack_yumi_energy(uuid[]),public.ack_yumi_energy(uuid[]) to authenticated;
