-- Supabase's default table privileges include TRUNCATE, REFERENCES and
-- TRIGGER for authenticated. RLS protects row DML but does not make those
-- table-level capabilities useful here, so replace the defaults with the
-- smallest surface each Notes table needs.

revoke all privileges on table public.notes from anon, authenticated;
revoke all privileges on table public.note_interpretations from anon, authenticated;
revoke all privileges on table public.note_shares from anon, authenticated;

grant select, insert, update, delete on table public.notes to authenticated;
grant select on table public.note_interpretations to authenticated;
grant select, insert, update, delete on table public.note_shares to authenticated;

-- Cover the two attribution foreign keys. The canonical note and its source
-- are deliberately independent, but deleting a source or owner should not
-- require a sequential scan through every saved fork.
create index if not exists notes_source_note_idx
  on public.notes (source_note_id)
  where source_note_id is not null;

create index if not exists notes_source_owner_idx
  on public.notes (source_owner_id)
  where source_owner_id is not null;

-- The UNIQUE(note_id, target_language) constraint already owns an index with
-- exactly these columns. Remove the redundant copy from the first migration.
drop index if exists public.note_interpretations_note_language_idx;
