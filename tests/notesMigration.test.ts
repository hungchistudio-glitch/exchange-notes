import { describe, expect, it } from "vitest";

import { readMigration } from "./readMigration";

const migration = readMigration("multilingual_social_notes");

describe("multilingual social notes migration", () => {
  it("preserves the canonical note and seeds existing translations without AI", () => {
    expect(migration).toContain("add column if not exists original_text text");
    expect(migration).toContain("'legacy-import'");
    expect(migration).toContain("on conflict (note_id, target_language) do nothing");
  });

  it("keeps notes private except for active direct recipients", () => {
    expect(migration).toContain("private.has_active_note_share(id, (select auth.uid()))");
    expect(migration).toContain("share.revoked_at is null");
    expect(migration).toContain("permission text not null default 'view' check (permission = 'view')");
    expect(migration).toContain("from public.friendships friendship");
  });

  it("does not grant browser clients permission to forge Yumi interpretations", () => {
    expect(migration).toContain("grant select on table public.note_interpretations to authenticated");
    expect(migration).not.toContain("grant select, insert, update, delete on table public.note_interpretations");
    expect(migration).toContain("revoke all privileges on table public.note_interpretations from authenticated");
    expect(migration).toContain("alter table public.note_interpretations enable row level security");
  });
});
