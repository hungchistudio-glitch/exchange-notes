-- The Yumi shop: what each piece costs, what each reader owns and wears,
-- and the only three ways to change either.
--
-- Energy cookies are counted, never stored. A reader has earned one for
-- every word in yumi_pet_state.fed_word_ids that is still in their library,
-- so the number cannot be raised by writing to a column, and feeding Yumi is
-- unchanged. Spending is its own ledger here: buying a piece never touches a
-- word, a review or Yumi's feeding history.
--
-- The browser is never trusted with a price. Every write goes through a
-- function that locks the reader's wardrobe row first, so two taps, two tabs
-- or two devices buying at once cannot charge twice or spend below zero, and
-- a piece already owned is never charged again. The privileged bodies live in
-- the private schema; the public functions are invoker wrappers, the same
-- shape as save_review_result_atomic.

-- ------------------------------------------------------------------ prices

create table if not exists public.yumi_shop_items (
  id text primary key,
  slot text not null check (slot in ('material', 'pupil', 'iris', 'eyewear', 'head', 'neck', 'pin', 'mouth', 'charm')),
  price integer not null check (price > 0),
  available boolean not null default true
);

alter table public.yumi_shop_items enable row level security;

drop policy if exists "Signed-in readers can see the shop's prices"
  on public.yumi_shop_items;
create policy "Signed-in readers can see the shop's prices"
  on public.yumi_shop_items for select to authenticated
  using (true);

revoke all privileges on table public.yumi_shop_items
  from public, anon, authenticated;
grant select on table public.yumi_shop_items to authenticated;

-- Kept equal to lib/shop/catalog.ts by tests/yumiShopCatalog.test.ts.
insert into public.yumi_shop_items (id, slot, price) values
  ('moon-pupil', 'pupil', 30),
  ('cat-pupil', 'pupil', 35),
  ('spiral-pupil', 'pupil', 35),
  ('diamond-pupil', 'pupil', 50),
  ('clover-pupil', 'pupil', 30),
  ('sparkle-pupil', 'pupil', 40),
  ('lake-iris', 'iris', 40),
  ('amber-iris', 'iris', 40),
  ('violet-iris', 'iris', 40),
  ('round-glasses', 'eyewear', 60),
  ('pirate-patch', 'eyewear', 50),
  ('long-lashes', 'eyewear', 45),
  ('jade', 'material', 120),
  ('celadon', 'material', 110),
  ('terrazzo', 'material', 100),
  ('plum-pupil', 'pupil', 30),
  ('steamer-hat', 'head', 90),
  ('market-bag', 'charm', 70),
  ('bubble-tea', 'mouth', 90),
  ('pineapple-cake', 'mouth', 50),
  ('soup-dumpling', 'mouth', 60),
  ('teapot-charm', 'charm', 70),
  ('sky-lantern', 'charm', 80),
  ('orchid-clip', 'pin', 50),
  ('jade-iris', 'iris', 45),
  ('denim', 'material', 100),
  ('brushed-silver', 'material', 120),
  ('cherry-enamel', 'material', 110),
  ('baseball-cap', 'head', 80),
  ('headphones', 'head', 100),
  ('star-pupil', 'pupil', 30),
  ('bagel', 'mouth', 50),
  ('pretzel', 'mouth', 50),
  ('pancakes', 'mouth', 70),
  ('jazz-mic', 'charm', 70),
  ('skateboard', 'charm', 70),
  ('road-sign', 'charm', 50),
  ('aviator-shades', 'eyewear', 70),
  ('porcelain', 'material', 110),
  ('champagne-brass', 'material', 130),
  ('burgundy-lacquer', 'material', 120),
  ('beret', 'head', 80),
  ('monocle', 'eyewear', 60),
  ('silk-scarf', 'neck', 70),
  ('croissant', 'mouth', 60),
  ('baguette', 'mouth', 60),
  ('macarons', 'mouth', 70),
  ('cafe-cup', 'mouth', 60),
  ('lavender-brooch', 'pin', 50),
  ('perfume', 'charm', 70),
  ('cat-eye-glasses', 'eyewear', 70),
  ('amber-glass', 'material', 150),
  ('carrara-marble', 'material', 140),
  ('terracotta', 'material', 100),
  ('venetian-mask', 'eyewear', 80),
  ('leather-strap', 'neck', 60),
  ('silk-knot', 'neck', 60),
  ('espresso', 'mouth', 50),
  ('gelato', 'mouth', 60),
  ('pasta-twirl', 'mouth', 70),
  ('moka-charm', 'charm', 60),
  ('art-book', 'charm', 60),
  ('lemon-brooch', 'pin', 45),
  ('murano-iris', 'iris', 50),
  ('trencadis', 'material', 130),
  ('azulejo', 'material', 120),
  ('sun-brass', 'material', 130),
  ('flamenco-fan', 'mouth', 70),
  ('hair-comb', 'head', 70),
  ('heart-pupil', 'pupil', 30),
  ('churros', 'mouth', 60),
  ('olive-tapas', 'mouth', 50),
  ('paella-pan', 'mouth', 80),
  ('guitar-charm', 'charm', 70),
  ('espadrille', 'charm', 50),
  ('sun-brooch', 'pin', 50),
  ('heart-shades', 'eyewear', 60)
on conflict (id) do update
  set slot = excluded.slot, price = excluded.price, available = true;

-- ---------------------------------------------------------------- wardrobe

create table if not exists public.yumi_wardrobe (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owned_item_ids text[] not null default '{}',
  outfit jsonb not null default '{}'::jsonb,
  cookies_spent integer not null default 0 check (cookies_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.yumi_wardrobe enable row level security;

drop policy if exists "Users can read their own wardrobe"
  on public.yumi_wardrobe;
create policy "Users can read their own wardrobe"
  on public.yumi_wardrobe for select to authenticated
  using ((select auth.uid()) = user_id);

-- No insert, update or delete for the browser: the functions below are the
-- only writers, and even TRUNCATE (which bypasses RLS) is not granted.
revoke all privileges on table public.yumi_wardrobe
  from public, anon, authenticated;
grant select on table public.yumi_wardrobe to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- --------------------------------------------------------------- counting

create or replace function private.yumi_cookies_earned(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct item.id)::integer
  from public.yumi_pet_state as pet
  join public.vocabulary_items as item
    on item.user_id = pet.user_id
   and item.id = any(pet.fed_word_ids)
  where pet.user_id = p_user_id;
$$;

create or replace function private.yumi_wardrobe_state(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'earned', counted.earned,
    'spent', coalesce(wardrobe.cookies_spent, 0),
    'balance', greatest(0, counted.earned - coalesce(wardrobe.cookies_spent, 0)),
    'owned', coalesce(pg_catalog.to_jsonb(wardrobe.owned_item_ids), '[]'::jsonb),
    'outfit', coalesce(wardrobe.outfit, '{}'::jsonb)
  )
  from (select private.yumi_cookies_earned(p_user_id) as earned) as counted
  left join public.yumi_wardrobe as wardrobe
    on wardrobe.user_id = p_user_id;
$$;

-- ------------------------------------------------------------------ reads

create or replace function private.get_yumi_wardrobe()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to open the shop.';
  end if;

  return private.yumi_wardrobe_state(v_user_id);
end;
$$;

-- ----------------------------------------------------------------- buying

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

  if private.yumi_cookies_earned(v_user_id) - v_wardrobe.cookies_spent < v_price then
    return pg_catalog.jsonb_build_object(
      'status', 'insufficient',
      'state', private.yumi_wardrobe_state(v_user_id)
    );
  end if;

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

-- ---------------------------------------------------------------- wearing

create or replace function private.wear_yumi_outfit(p_outfit jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owned text[];
  v_clean jsonb := '{}'::jsonb;
  v_slot text;
  v_item text;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to dress Yumi.';
  end if;

  if p_outfit is null or pg_catalog.jsonb_typeof(p_outfit) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'An outfit maps each slot to one piece.';
  end if;

  insert into public.yumi_wardrobe (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select wardrobe.owned_item_ids
  into v_owned
  from public.yumi_wardrobe as wardrobe
  where wardrobe.user_id = v_user_id
  for update;

  for v_slot, v_item in
    select entry.key, entry.value from pg_catalog.jsonb_each_text(p_outfit) as entry
  loop
    if v_item is null or v_item = '' then
      continue;
    end if;

    -- Only a piece the reader owns, and only in its own slot.
    if not (v_item = any(v_owned)) or not exists (
      select 1 from public.yumi_shop_items as item
      where item.id = v_item and item.slot = v_slot
    ) then
      raise exception using
        errcode = '42501',
        message = 'Only owned pieces can be worn, each in its own place.';
    end if;

    v_clean := v_clean || pg_catalog.jsonb_build_object(v_slot, v_item);
  end loop;

  update public.yumi_wardrobe
  set outfit = v_clean,
      updated_at = now()
  where user_id = v_user_id;

  return private.yumi_wardrobe_state(v_user_id);
end;
$$;

-- --------------------------------------------------------- public doorways

create or replace function public.get_yumi_wardrobe()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_yumi_wardrobe();
$$;

create or replace function public.buy_yumi_item(p_item_id text)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.buy_yumi_item(p_item_id);
$$;

create or replace function public.wear_yumi_outfit(p_outfit jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.wear_yumi_outfit(p_outfit);
$$;

-- The two helpers take any user's id, so nobody calls them directly; the
-- definer functions above reach them as their owner.
revoke all on function private.yumi_cookies_earned(uuid) from public, anon, authenticated;
revoke all on function private.yumi_wardrobe_state(uuid) from public, anon, authenticated;

revoke all on function private.get_yumi_wardrobe() from public, anon, authenticated;
revoke all on function private.buy_yumi_item(text) from public, anon, authenticated;
revoke all on function private.wear_yumi_outfit(jsonb) from public, anon, authenticated;
grant execute on function private.get_yumi_wardrobe() to authenticated;
grant execute on function private.buy_yumi_item(text) to authenticated;
grant execute on function private.wear_yumi_outfit(jsonb) to authenticated;

revoke all on function public.get_yumi_wardrobe() from public, anon, authenticated;
revoke all on function public.buy_yumi_item(text) from public, anon, authenticated;
revoke all on function public.wear_yumi_outfit(jsonb) from public, anon, authenticated;
grant execute on function public.get_yumi_wardrobe() to authenticated;
grant execute on function public.buy_yumi_item(text) to authenticated;
grant execute on function public.wear_yumi_outfit(jsonb) to authenticated;

comment on function public.buy_yumi_item(text) is
  'Buys one Yumi shop piece with energy cookies (fed words still in the library, minus cookies already spent). Locks the caller''s wardrobe row; never charges twice or below zero.';
comment on function public.wear_yumi_outfit(jsonb) is
  'Saves what Yumi wears. Accepts only pieces the caller owns, each in its own slot.';
