import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Yumi Pocket Lookup's share-extension keys (Chi, 2026-11-12: 專用小鑰匙):
 * a key opens the lookup and the pocket save for its holder, is stored only
 * as a hash, and stops the moment it is revoked.
 */

type Row = Record<string, unknown>;

/* A small stand-in for the service client, over in-memory tables. */
function fakeService(tables: Record<string, Row[]>) {
  const inserted: Array<{ table: string; row: Row }> = [];
  const updated: Array<{ table: string; values: Row }> = [];
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let pendingUpdate: Row | null = null;
    let pendingInsert: Row | null = null;
    const api = {
      select: () => api,
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return api;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return api;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return api;
      },
      order: () => api,
      update: (values: Row) => {
        pendingUpdate = values;
        updated.push({ table, values });
        return api;
      },
      insert: (row: Row) => {
        pendingInsert = { id: `id-${inserted.length + 1}`, created_at: "2026-11-12T00:00:00Z", ...row };
        inserted.push({ table, row: pendingInsert });
        (tables[table] ??= []).push(pendingInsert);
        return api;
      },
      maybeSingle: async () => ({ data: (tables[table] ?? []).find((row) => filters.every((f) => f(row))) ?? null, error: null }),
      single: async () => ({ data: pendingInsert, error: null }),
      then: (resolve: (value: { data: Row[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) => {
        const rows = (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
        if (pendingUpdate) for (const row of rows) Object.assign(row, pendingUpdate);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return api;
  }
  return { client: { from } as never, inserted, updated, tables };
}

const keys = await import("@/lib/pocket/keys");

describe("a pocket key", () => {
  it("is long, random and recognisable, and only its hash is kept", () => {
    const a = keys.generatePocketKey();
    const b = keys.generatePocketKey();
    expect(a).toMatch(/^enpk_[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(keys.hashPocketKey(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(keys.hashPocketKey(a)).not.toContain(a.slice(5));
  });

  it("is read from a bearer header and nothing looser", () => {
    const key = keys.generatePocketKey();
    const request = (value: string) => new Request("https://x/", { headers: { authorization: value } });
    expect(keys.pocketKeyFrom(request(`Bearer ${key}`))).toBe(key);
    expect(keys.pocketKeyFrom(request(key))).toBeNull();
    expect(keys.pocketKeyFrom(request("Bearer eyJhbGciOi.jwt.token"))).toBeNull();
    expect(keys.pocketKeyFrom(new Request("https://x/"))).toBeNull();
  });

  it("answers for its holder, and for nobody once revoked", async () => {
    const key = keys.generatePocketKey();
    const { client, tables } = fakeService({
      pocket_keys: [{ id: "k1", user_id: "reader", key_hash: keys.hashPocketKey(key), last_used_at: null, revoked_at: null }],
    });
    expect(await keys.userForPocketKey(client, key)).toBe("reader");
    expect(tables.pocket_keys[0].last_used_at).not.toBeNull();
    expect(await keys.userForPocketKey(client, keys.generatePocketKey())).toBeNull();
    tables.pocket_keys[0].revoked_at = "2026-11-12T01:00:00Z";
    expect(await keys.userForPocketKey(client, key)).toBeNull();
  });

  it("is issued with its hash stored, never the key", async () => {
    const { client, inserted } = fakeService({ pocket_keys: [] });
    const issued = await keys.issuePocketKey(client, "reader", "Chi's iPhone");
    expect(issued.key).toMatch(/^enpk_/);
    expect(inserted[0].row.key_hash).toBe(keys.hashPocketKey(issued.key));
    expect(JSON.stringify(inserted[0].row)).not.toContain(issued.key);
  });

  it("names a device sensibly", () => {
    expect(keys.cleanLabel("  Chi's   iPhone ")).toBe("Chi's iPhone");
    expect(keys.cleanLabel("")).toBe("iPhone");
    expect(keys.cleanLabel(42)).toBe("iPhone");
    expect(keys.cleanLabel("x".repeat(80))).toHaveLength(40);
  });
});

describe("saving from the share extension", () => {
  let service: ReturnType<typeof fakeService>;
  const key = keys.generatePocketKey();

  beforeEach(() => {
    service = fakeService({
      pocket_keys: [{ id: "k1", user_id: "reader", key_hash: keys.hashPocketKey(key), last_used_at: new Date().toISOString(), revoked_at: null }],
      vocabulary_items: [{ id: "old", user_id: "reader", word: "merci", word_language: "fr", texts: { fr: "merci", "zh-TW": "謝謝" } }],
    });
    vi.resetModules();
    vi.doMock("@/lib/supabase/service", () => ({ createServiceClient: () => service.client }));
    vi.doMock("@/lib/profile/languagePair", () => ({
      readLanguageRoles: async () => ({ learning: "en", support: "zh-TW", native: "zh-TW" }),
    }));
  });

  async function save(body: unknown, auth = `Bearer ${key}`) {
    const { POST } = await import("@/app/api/pocket/save/route");
    const response = await POST(new Request("https://x/api/pocket/save", {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/json" },
      body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  }

  it("refuses anything but a live key", async () => {
    expect((await save({ term: "hello" }, "")).status).toBe(401);
    expect((await save({ term: "hello" }, `Bearer ${keys.generatePocketKey()}`)).status).toBe(401);
  });

  it("refuses a word with nothing in it, or too much", async () => {
    expect((await save({ term: "  " })).status).toBe(400);
    expect((await save({ term: "x".repeat(201) })).status).toBe(400);
  });

  it("saves the row the app would have, for the key's holder", async () => {
    const result = await save({
      term: "thank you",
      translation: "謝謝",
      termLanguage: "en",
      translationLanguage: "zh-TW",
      termExample: "Thank you for coming.",
      translationExample: "謝謝你來。",
      category: "actions",
      confidence: "high",
    });
    expect(result).toMatchObject({ status: 200, body: { status: "saved" } });
    const row = service.inserted.find((entry) => entry.table === "vocabulary_items")!.row;
    expect(row).toMatchObject({
      user_id: "reader",
      word: "thank you",
      translation: "謝謝",
      word_language: "en",
      translation_language: "zh-TW",
      language: "en",
      texts: { en: "thank you", "zh-TW": "謝謝" },
      category: "actions",
      confidence: "high",
      status: "new",
    });
  });

  it("says so, and saves nothing, when the word is already there", async () => {
    const result = await save({ term: "merci", translation: "謝謝", termLanguage: "fr", translationLanguage: "zh-TW" });
    expect(result.body).toEqual({ status: "duplicate", id: "old" });
    expect(service.inserted.filter((entry) => entry.table === "vocabulary_items")).toHaveLength(0);
  });
});
