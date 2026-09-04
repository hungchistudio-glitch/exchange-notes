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
