-- Bring a database built from these migrations in line with production.
--
-- Twenty objects existed on the deployed database and in no migration file:
-- they were added through the Supabase dashboard, so `supabase db reset`
-- produced a schema that was quietly different from the one the app runs
-- against. Found by enumerating production's constraints, indexes, functions,
-- triggers and policies and checking each against this directory. Functions
-- (9), triggers (2) and RLS policies (65) were already complete; what follows
-- is everything that was not.
--
-- The already-applied migrations are left alone rather than edited, for the
-- same reason 20260816234031 was kept as its own file: what has run has run,
-- and rewriting it makes the history a lie.
--
-- Every statement is a no-op against production and does real work only on a
-- fresh database, so this is safe to apply either way.

-- ---------- 1. Foreign keys that cascade on delete ----------
--
-- The messaging baseline (20260803022302) declares thirteen foreign keys with
-- no delete rule; production has ON DELETE CASCADE on all thirteen. Without
-- it, deleting an auth user fails outright — the account's messages,
-- memberships and friendships hold references that NO ACTION refuses to drop.
-- Later migrations all write `on delete cascade` inline; only this file's
-- tables were left behind.
--
-- Guarded on the current rule rather than dropped and re-added unconditionally,
-- so production does no work and takes no window where the constraint is
-- absent. confdeltype 'c' is CASCADE; 'a' is the NO ACTION a fresh build gets.
do $$
declare
  target record;
begin
  for target in
    select *
    from (values
      ('profiles',             'profiles_id_fkey',                       'id',              'auth.users (id)'),
      ('friend_requests',      'friend_requests_sender_id_fkey',         'sender_id',       'public.profiles (id)'),
      ('friend_requests',      'friend_requests_receiver_id_fkey',       'receiver_id',     'public.profiles (id)'),
      ('friendships',          'friendships_user_one_id_fkey',           'user_one_id',     'public.profiles (id)'),
      ('friendships',          'friendships_user_two_id_fkey',           'user_two_id',     'public.profiles (id)'),
      ('conversation_members', 'conversation_members_conversation_id_fkey', 'conversation_id', 'public.conversations (id)'),
      ('conversation_members', 'conversation_members_user_id_fkey',      'user_id',         'auth.users (id)'),
      ('messages',             'messages_conversation_id_fkey',          'conversation_id', 'public.conversations (id)'),
      ('messages',             'messages_sender_id_fkey',                'sender_id',       'auth.users (id)'),
      ('message_user_states',  'message_user_states_message_id_fkey',    'message_id',      'public.messages (id)'),
      ('message_user_states',  'message_user_states_user_id_fkey',       'user_id',         'auth.users (id)'),
      ('hidden_messages',      'hidden_messages_user_id_fkey',           'user_id',         'auth.users (id)'),
      ('hidden_messages',      'hidden_messages_message_id_fkey',        'message_id',      'public.messages (id)')
    ) as t (table_name, constraint_name, column_name, references_clause)
  loop
    if exists (
      select 1
      from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public'
        and r.relname = target.table_name
        and c.conname = target.constraint_name
        and c.contype = 'f'
        and c.confdeltype <> 'c'
    ) then
      execute format(
        'alter table public.%I drop constraint %I',
        target.table_name, target.constraint_name
      );

      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references %s on delete cascade',
        target.table_name, target.constraint_name, target.column_name,
        target.references_clause
      );
    end if;
  end loop;
end $$;

-- ---------- 2. Constraints ----------

-- One friendship per pair.
--
-- lib/friends.ts writes this table through an upsert with
-- `onConflict: "user_one_id,user_two_id"`, and ON CONFLICT (cols) requires a
-- matching unique index. Without it, accepting a friend request fails with
-- 42P10 — "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" — on every fresh database. The pair is canonicalised by
-- orderedPair() before the write, so one orientation per pair is the whole
-- rule; this is not a substitute for that ordering.
do $$ begin
  alter table public.friendships
    add constraint friendships_user_pair_unique unique (user_one_id, user_two_id);
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

-- The two languages have to differ.
--
-- Onboarding already refuses to save a matching pair (see the
-- sameLanguageHint copy), but the column pair is what makes a word card have a
-- hero language and a support language at all — the app has no rendering for
-- the case where they are the same.
do $$ begin
  alter table public.profiles
    add constraint profiles_different_languages_check
    check (native_language <> learning_language);
exception
  when duplicate_object then null;
end $$;

-- ---------- 3. Indexes ----------

-- The conversation timeline's own index: every thread opens with
-- `where conversation_id = ? order by created_at`, which is exactly this.
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Exchange IDs are matched case-insensitively — findProfileByExchangeId uses
-- ilike — so uniqueness has to be case-insensitive too, or @Maegan and @maegan
-- are two accounts that look like one. The plain unique constraint on
-- exchange_id does not cover that; this does.
create unique index if not exists profiles_exchange_id_unique_idx
  on public.profiles (lower(exchange_id));

-- The three orderings the vocabulary screens and the review engine actually
-- sort by, all scoped per user.
create index if not exists vocabulary_items_user_created_idx
  on public.vocabulary_items (user_id, created_at desc);

create index if not exists vocabulary_items_last_reviewed_idx
  on public.vocabulary_items (user_id, last_reviewed_at);

create index if not exists vocabulary_items_review_count_idx
  on public.vocabulary_items (user_id, review_count);
