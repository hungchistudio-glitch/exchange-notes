-- Save a spaced-repetition grade as one indivisible database operation.
--
-- The old browser flow read a vocabulary row, updated its schedule, and then
-- inserted a review event in three separate requests. Two tabs could both
-- calculate from the same counters and lose one review; an event failure also
-- left the row updated without the matching audit record. This function locks
-- the owned row before reading its counters, performs both writes in the same
-- transaction, and lets every error roll the whole statement back.

-- Production records 20260717050000_review_engine_3 as applied, but the table
-- itself is absent there. Re-declare the complete object here so migration
-- history and the live schema converge, while remaining a no-op for databases
-- where that earlier migration did leave the table behind.
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_item_id uuid not null
    references public.vocabulary_items(id) on delete cascade,
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  interval_days numeric not null,
  ease_factor numeric not null,
  response_time_ms integer,
  created_at timestamptz not null default now()
);

alter table public.review_events enable row level security;

drop policy if exists "Users can view own review events"
  on public.review_events;
create policy "Users can view own review events"
  on public.review_events for select to authenticated
  using ((select auth.uid()) = user_id);

-- The original policy allowed direct browser inserts. Events are now written
-- only by the atomic operation below; leaving that policy would make the audit
-- trail forgeable as soon as somebody restored a table-level INSERT grant.
drop policy if exists "Users can insert own review events"
  on public.review_events;

create index if not exists review_events_user_created_idx
  on public.review_events (user_id, created_at desc);
create index if not exists review_events_vocabulary_idx
  on public.review_events (vocabulary_item_id, created_at desc);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.apply_review_result_atomic(
  p_vocabulary_item_id uuid,
  p_grade text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_item public.vocabulary_items%rowtype;
  v_now timestamptz;
  v_quality integer;
  v_previous_ease numeric;
  v_previous_repetitions integer;
  v_previous_interval numeric;
  v_review_count integer;
  v_correct_count integer;
  v_lapses integer;
  v_ease numeric;
  v_repetitions integer;
  v_interval_days numeric;
  v_grade_multiplier numeric := 1;
  v_accuracy numeric;
  v_retention_score integer;
  v_status text;
  v_next_review_at timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to save a review.';
  end if;

  if p_vocabulary_item_id is null then
    raise exception using
      errcode = '22023',
      message = 'A vocabulary item is required.';
  end if;

  v_quality := case p_grade
    when 'again' then 1
    when 'hard' then 3
    when 'good' then 4
    when 'easy' then 5
    else null
  end;

  if v_quality is null then
    raise exception using
      errcode = '22023',
      message = 'Review grade must be again, hard, good, or easy.';
  end if;

  -- SECURITY DEFINER is confined to the private schema and every access is
  -- still scoped to auth.uid(). A missing row and somebody else's row share
  -- the same response, so this check does not become an ownership oracle.
  select item.*
  into v_item
  from public.vocabulary_items as item
  where item.id = p_vocabulary_item_id
    and item.user_id = v_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Vocabulary item not found.';
  end if;

  -- Take the timestamp after acquiring the row lock. If another review was
  -- ahead of this one, the second result cannot move last_reviewed_at back to
  -- the time at which it began waiting.
  v_now := pg_catalog.clock_timestamp();

  v_previous_ease := least(
    3.2,
    greatest(1.3, coalesce(v_item.review_ease, 2.5))
  );
  v_previous_repetitions := greatest(
    0,
    coalesce(v_item.review_repetitions, 0)
  );
  v_previous_interval := greatest(
    0,
    coalesce(v_item.review_interval, 0)
  );
  v_review_count := greatest(0, coalesce(v_item.review_count, 0)) + 1;
  v_correct_count := greatest(0, coalesce(v_item.correct_count, 0))
    + case when v_quality >= 3 then 1 else 0 end;
  v_lapses := greatest(0, coalesce(v_item.review_lapses, 0))
    + case when v_quality < 3 then 1 else 0 end;

  v_ease := v_previous_ease;
  v_repetitions := v_previous_repetitions;

  if v_quality < 3 then
    v_repetitions := 0;
    v_interval_days := 10::numeric / 1440;
    v_ease := greatest(1.3, v_previous_ease - 0.2);
  else
    v_repetitions := v_previous_repetitions + 1;
    v_ease := least(
      3.2,
      greatest(
        1.3,
        v_previous_ease
          + 0.1
          - (5 - v_quality) * (0.08 + (5 - v_quality) * 0.02)
      )
    );

    if v_repetitions = 1 then
      v_interval_days := case when p_grade = 'easy' then 4 else 1 end;
    elsif v_repetitions = 2 then
      v_interval_days := case when p_grade = 'hard' then 3 else 6 end;
    else
      v_grade_multiplier := case p_grade
        when 'hard' then 0.8
        when 'easy' then 1.3
        else 1
      end;
      v_interval_days := greatest(
        1,
        v_previous_interval * v_ease * v_grade_multiplier
      );
    end if;
  end if;

  -- Match lib/review/sm2.ts exactly: interval is persisted to three decimal
  -- places, ease to two, and retention is based on the rounded interval.
  v_interval_days := pg_catalog.round(v_interval_days, 3);
  v_ease := pg_catalog.round(v_ease, 2);
  v_accuracy := v_correct_count::numeric / v_review_count;
  v_retention_score := pg_catalog.round(
    greatest(
      0,
      least(
        100,
        v_accuracy * 75 + least(v_interval_days, 30) / 30 * 25
      )
    )
  )::integer;
  v_status := case
    when v_repetitions >= 5 and v_interval_days >= 21 then 'mastered'
    else 'learning'
  end;
  v_next_review_at := v_now + v_interval_days * interval '1 day';

  update public.vocabulary_items
  set
    status = v_status,
    next_review_at = v_next_review_at,
    last_reviewed_at = v_now,
    review_interval = v_interval_days,
    review_ease = v_ease,
    review_count = v_review_count,
    correct_count = v_correct_count,
    review_repetitions = v_repetitions,
    review_lapses = v_lapses,
    retention_score = v_retention_score,
    updated_at = v_now
  where id = p_vocabulary_item_id
    and user_id = v_user_id;

  if not found then
    -- Defensive against a future trigger deleting/reassigning the locked row.
    raise exception using
      errcode = 'P0002',
      message = 'Vocabulary item not found.';
  end if;

  insert into public.review_events (
    user_id,
    vocabulary_item_id,
    grade,
    interval_days,
    ease_factor,
    response_time_ms,
    created_at
  ) values (
    v_user_id,
    p_vocabulary_item_id,
    p_grade,
    v_interval_days,
    v_ease,
    null,
    v_now
  );

  return pg_catalog.jsonb_build_object(
    'status', v_status,
    'next_review_at', v_next_review_at,
    'last_reviewed_at', v_now,
    'review_interval', v_interval_days,
    'review_ease', v_ease,
    'review_count', v_review_count,
    'correct_count', v_correct_count,
    'review_repetitions', v_repetitions,
    'review_lapses', v_lapses,
    'retention_score', v_retention_score
  );
end;
$$;

-- Keep the privileged implementation outside the exposed schema. The public
-- RPC is an invoker-rights wrapper, has no attacker-controlled search path,
-- and is the only endpoint PostgREST needs to expose.
create or replace function public.save_review_result_atomic(
  p_vocabulary_item_id uuid,
  p_grade text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.apply_review_result_atomic(
    p_vocabulary_item_id,
    p_grade
  );
$$;

revoke all on function private.apply_review_result_atomic(uuid, text)
  from public, anon, authenticated;
grant execute on function private.apply_review_result_atomic(uuid, text)
  to authenticated;

revoke all on function public.save_review_result_atomic(uuid, text)
  from public, anon, authenticated;
grant execute on function public.save_review_result_atomic(uuid, text)
  to authenticated;

-- Review events are an audit trail, not a client-writable table. RLS remains
-- defense in depth, while this grant boundary prevents a signed-in browser
-- from fabricating an event without the matching schedule update. SELECT is
-- the sole client privilege; even TRUNCATE (which bypasses RLS) is absent.
revoke all privileges on table public.review_events
  from public, anon, authenticated;
grant select on table public.review_events to authenticated;

comment on function public.save_review_result_atomic(uuid, text) is
  'Authenticated atomic review save. Serializes on the caller-owned vocabulary row, updates its SM-2 state, and inserts the matching immutable review event in one transaction.';

comment on function private.apply_review_result_atomic(uuid, text) is
  'Privileged implementation for save_review_result_atomic. Not exposed by the Data API; validates auth.uid ownership before every write.';
