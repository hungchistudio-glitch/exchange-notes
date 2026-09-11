# Migrations

One rule, and it is the one that has already been broken once: **the
filename's version must equal the version the database recorded.**

`supabase db push` decides what to apply by comparing the leading timestamp
of each file against `supabase_migrations.schema_migrations.version`. A file
whose version is not in that table is, as far as the CLI is concerned,
unapplied — and it will be replayed.

## How the drift happened

Applying through the Supabase MCP's `apply_migration` stamps the table with a
version generated *at apply time*. Committing the SQL afterwards under a
timestamp chosen by hand produces two different versions for one migration.
Five of them drifted that way before this was noticed:

| was committed as | the database recorded |
| --- | --- |
| `20260819120000_daily_news_pool` | `20260819135439` |
| `20260822210000_pronunciation_lab` | `20260823001230` |
| `20260823100000_word_phonetics_cache` | `20260823131423` |
| `20260823120000_text_translations_cache` | `20260823150634` |
| `20260823160000_vocabulary_language_identity` | `20260823222407` |

It happened twice more with the Notes work, found on 2026-08-30 while checking
parity after applying `vocabulary_media`, and fixed the same way:

| was committed as | the database recorded |
| --- | --- |
| `20260829041644_multilingual_social_notes` | `20260829044233` |
| `20260829044312_notes_least_privilege_grants` | `20260829044342` |

And three more, found on 2026-09-04 while checking parity before applying
`ai_quota_local_day` — the same cause each time, an MCP `apply_migration`
stamping its own version:

| was committed as | the database recorded |
| --- | --- |
| `20260831225716_ai_quota_refund` | `20260831232428` |
| `20260902005607_public_profiles_read_only` | `20260902005619` |
| `20260902012506_repair_rows_without_texts` | `20260902012558` |

`ai_quota_local_day` was committed as `20260904165110` and recorded as
`20260904173633`, and has been renamed on the same pass. All four files now
match their rows, and the two sets are exactly equal at 66 each.

And twice more, found on 2026-09-11 while checking parity before applying the
landing-page branch's five migrations:

| was committed as | the database recorded |
| --- | --- |
| `20260910190000_ai_quota_server_only` | `20260910192557` |
| `20260910190100_ai_quota_drop_client_callable` | `20260910193025` |

That pass also turned up the other direction of the same problem — SQL applied
to production that was never committed at all:

| recorded in the database | where the file was |
| --- | --- |
| `20260909130734_schedule_yumi_reminders` | open on PR #116, unmerged |
| `20260909130947_move_pg_net_out_of_public` | open on PR #116, unmerged |

Both are committed now, verbatim from that branch, having been checked
statement-for-statement against
`supabase_migrations.schema_migrations.statements`. **Applying from a branch
and merging it are two separate acts, and production only ever saw the first
one.**

The lesson keeps being the same one: **read the recorded version back
immediately after applying, and rename the file to match before committing.**

The first of those would have failed a replay rather than merely repeating it:
it has nine `create policy` statements and only five `drop policy if exists`
guards, so four of them would have raised `42710` against policies that are
already there.

Nothing was lost — the counts matched, so it was a pure renaming drift — but
`db push` would have tried to replay all five, and four of them would have
failed on `create policy`, which has no `if not exists` form and raises
`42710 duplicate_object` against a policy that is already there. Each
migration runs in its own transaction, so those would have rolled back
cleanly rather than half-applying. The files have been renamed to the
recorded versions and the two sets now match exactly.

And five more the same day, applying this branch's own migrations — recorded
here as it happened rather than discovered later:

| was committed as | the database recorded |
| --- | --- |
| `20260910120000_secure_web_push_endpoints` | `20260911185850` |
| `20260910121000_review_queue_not_null` | `20260911185858` |
| `20260910122000_lock_down_social_graph` | `20260911190150` |
| `20260911114625_message_analysis_language_pair` | `20260911190225` |
| `20260911114734_atomic_review_save` | `20260911190333` |

The two second-half migrations were renumbered on the same pass — to
`20260911192656` and `20260911192708` — because the renames above moved their
first halves past them, and a second half that sorts before its first half is
a replay that cannot work. Applied after the deploy, they drifted in their
turn and were renamed again:

| was committed as | the database recorded |
| --- | --- |
| `20260911192656_lock_down_social_graph_grants` | `20260911192656` |
| `20260911192708_message_analysis_pair_key` | `20260911192708` |

**Twelve renames across five occasions now. `apply_migration` always stamps its
own version; the filename it was given is never what lands.** Read the
version back and rename before committing, every time.

## Rebuilding from empty

`supabase start` against an empty database applies every file in this
directory in filename order. Until 2026-09-11 it stopped on the third one:
`20260713173000_add_shared_article` alters `public.messages`, and nothing
before it creates that table. Production had it — it was made in the
dashboard — so nothing noticed for two months.

Two files close that gap. They create what the chain had always assumed:

| | |
| --- | --- |
| `20260711000000_baseline_tables_created_outside_the_chain` | `vocabulary_items` and `notes`, which no migration ever created; the messaging tables, which `20260803022302` creates three weeks after the files that alter them; and `is_conversation_member()` |
| `20260816030300_baseline_policies_created_outside_the_chain` | the sixteen RLS policies `20260816030329` rewrites but nothing creates |

Both are entirely `if not exists` / `drop policy if exists`, so they are
no-ops against production and against any database built from the chain
since.

Verified by replaying all 79 files into an empty local database and comparing
the result to production column by column, at a moment when five of them had
not yet been applied there. Every difference was one of those five, plus
`ai_lessons` (created by `20260717100000_ai_coach` and since dropped from
production outside the chain) and `vocabulary_examples_backup_20260831` (made
by hand). All five have since been applied.

`tests/migrationChain.test.ts` holds the invariant statically, so the next
migration written against something no earlier one creates fails in CI rather
than two months later.

## Checking

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

against `ls supabase/migrations`. Every file should have a row and every row
a file.

## Writing one

Prefer statements that can be run twice, because a migration that has to be
re-run — a fresh environment, a recovered database, a version mismatch like
the one above — should not need a human to unpick it first:

- `create table if not exists`, `create index if not exists`,
  `alter table … add column if not exists`
- `drop constraint if exists` immediately before `add constraint`
- `drop policy if exists` immediately before `create policy` — there is no
  `create policy if not exists`
- `create or replace function`
- guard backfills with a `where` that stops matching once they have run, and
  give data inserts an `on conflict … do nothing`

Destructive statements — `drop table`, `drop column`, `truncate` — belong in
their own migration, after the code that stopped reading the thing has been
live for a while.
