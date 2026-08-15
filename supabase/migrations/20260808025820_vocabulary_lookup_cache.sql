-- Shared vocabulary lookup cache.
--
-- Before this table the only cache was a per-instance in-memory Map capped at
-- 500 entries. On serverless that cache dies with every cold start and is not
-- shared between concurrent instances, so the same word was re-billed to
-- Gemini over and over. This table makes a lookup a one-time cost for the
-- whole app: the first user to look up a word pays, everyone after reads it
-- back for free.
--
-- Only validated model results are written here. Offline dictionary fallbacks
-- carry canned template example sentences, and caching those would pin the
-- degraded copy in front of every future user.
--
-- No user-facing policies are created. Reads and writes both go through the
-- service role in server routes.

create table if not exists public.vocabulary_lookup_cache (
  query_key text primary key
    check (char_length(query_key) between 1 and 80),

  schema_version integer not null default 1
    check (schema_version >= 1 and schema_version <= 1000),

  result jsonb not null
    check (
      jsonb_typeof(result) = 'object'
      and octet_length(result::text) <= 8192
    ),

  source text not null
    check (source ~ '^[a-z0-9._-]{1,60}$'),

  hit_count integer not null default 0
    check (hit_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  vocabulary_lookup_cache_updated_at_idx
  on public.vocabulary_lookup_cache (updated_at desc);

alter table public.vocabulary_lookup_cache enable row level security;

-- Supabase default privileges grant new public-schema tables to anon and
-- authenticated directly. A revoke aimed at the PUBLIC pseudo-role does not
-- remove those direct grants, so name both roles explicitly.
revoke all privileges on table public.vocabulary_lookup_cache
  from public, anon, authenticated;

-- Counting hits inside the database keeps the read path to a single round
-- trip; callers invoke this without awaiting it. Restricted to the service
-- role because every caller is a server route.
create or replace function public.touch_vocabulary_lookup_cache(p_query_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.vocabulary_lookup_cache
  set hit_count = hit_count + 1
  where query_key = p_query_key;
$$;

revoke all on function public.touch_vocabulary_lookup_cache(text)
  from public, anon, authenticated;

comment on table public.vocabulary_lookup_cache is
  'Shared Gemini vocabulary lookup results, keyed by normalized query. Server-role access only.';

comment on column public.vocabulary_lookup_cache.source is
  'Model id that produced the entry. Offline fallback results are never stored.';

comment on column public.vocabulary_lookup_cache.schema_version is
  'Bump when VocabularyLookupResult changes shape so stale entries are ignored rather than served.';
