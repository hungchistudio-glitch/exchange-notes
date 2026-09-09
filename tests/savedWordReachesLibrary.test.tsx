import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   A word saved anywhere appears in the library at once

   Reported as "with a big library the new word only shows up after
   restarting the app", and the size was a red herring that pointed straight
   at the cause.

   The provider lives in the protected layout, so it stays mounted while the
   reader walks from the camera back to their words. `items` is the array it
   loaded when the app started. Four of the five save surfaces — the camera,
   the news drawer, a message, the menu scanner — put a row in the database
   and told that array nothing, so the word was saved and invisible.

   The fifth, the lookup sheet, worked only because its callers happened to
   pass `onSaved: addItem`. Nothing made the other four do the same, and
   nothing would have made a sixth.

   Why a small library hid it: the background language fill still has work to
   do on a young library, and it calls refreshQuietly when a batch lands,
   which re-reads the list from the server and sweeps the missing word in as
   a side effect. On a settled library the fill returns before it starts, the
   incidental refresh never happens, and the bug is plain. It was always
   there.

   These cases drive the real provider rather than a harness shaped like it.
   A harness that mirrors the context would have passed on the day this was
   broken.
   ========================================================= */

const USER = { id: "reader-1" };

/** Rows the "server" holds. The saved word is deliberately never added. */
const serverRows: VocabularyItem[] = [];

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: USER } } }),
      getUser: async () => ({ data: { user: USER } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { learning_language: "en" } }),
          order: async () => ({ data: serverRows, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/offline/vocabulary", () => ({
  readMirror: async () => [],
  readOutbox: async () => [],
  writeMirror: async () => {},
  forgetMirror: async () => {},
  applyPending: (mirror: VocabularyItem[]) => mirror,
}));

vi.mock("@/lib/offline/sync", () => ({ flushOutbox: async () => ({ sent: 0 }) }));
vi.mock("@/lib/media/orphanSweep", () => ({ sweepOrphans: async () => {} }));

/*
 * The fill is the incidental refresh that used to hide this. Held inert so
 * the cases below prove the announcement works and not that a background
 * task happened to paper over its absence.
 */
vi.mock("@/hooks/useVocabularyLanguageFill", () => ({
  useVocabularyLanguageFill: () => ({ filling: false }),
}));

/** The row the "insert" hands back, set per case. */
let insertedRow: Record<string, unknown> | null = null;

vi.mock("@/lib/vocabulary/repository", async () => ({
  getCurrentUser: async () => ({ user: USER }),
  fetchVocabulary: async () => serverRows,
  insertVocabulary: async (payload: Record<string, unknown>) => {
    insertedRow = { ...payload, id: "saved-1", created_at: "2026-09-01T00:00:00.000Z" };
    return insertedRow;
  },
}));

vi.mock("@/lib/lexicon/personal", () => ({ findDuplicate: () => null }));

const { VocabularyProvider, useVocabulary } = await import(
  "@/contexts/VocabularyContext"
);
const { announceWordSaved, subscribeToSavedWords } = await import(
  "@/lib/vocabulary/savedWords"
);
const { createVocabularyEntry } = await import("@/lib/vocabulary/createEntry");

function wordNamed(word: string, id = word): VocabularyItem {
  return {
    id,
    user_id: USER.id,
    word,
    translation: "字",
    word_language: "en",
    translation_language: "zh-TW",
    texts: { en: word, "zh-TW": "字" },
    examples: {},
    created_at: "2026-09-01T00:00:00.000Z",
  } as unknown as VocabularyItem;
}

function Library() {
  const { items, loading } = useVocabulary();

  if (loading) return <p>loading</p>;

  return (
    <ul aria-label="library">
      {items.map((item) => (
        <li key={item.id}>{item.word}</li>
      ))}
    </ul>
  );
}

async function mountedLibrary() {
  render(
    <VocabularyProvider>
      <Library />
    </VocabularyProvider>,
  );

  await waitFor(() => expect(screen.getByLabelText("library")).toBeTruthy());
}

beforeEach(() => {
  serverRows.length = 0;
});

describe("saving a word while the library is already on screen", () => {
  it("puts it in the list without anyone asking the server again", async () => {
    /*
     * The whole bug in one case. The server list never changes here — if the
     * word appears, it appeared because the save announced itself.
     */
    serverRows.push(wordNamed("established"));

    await mountedLibrary();
    expect(screen.queryByText("lamp")).toBeNull();

    await act(async () => {
      announceWordSaved(wordNamed("lamp"));
    });

    expect(screen.getByText("lamp")).toBeTruthy();
  });

  it("puts the newest word first", async () => {
    // The list is ordered newest first, and a word saved a second ago is the
    // newest thing in it.
    serverRows.push(wordNamed("established"));

    await mountedLibrary();

    await act(async () => {
      announceWordSaved(wordNamed("lamp"));
    });

    const shown = screen
      .getAllByRole("listitem")
      .map((node) => node.textContent);

    expect(shown).toEqual(["lamp", "established"]);
  });

  it("does not show the same word twice when a screen also reports it", async () => {
    /*
     * The lookup sheet still passes onSaved: addItem, so that path announces
     * and calls addItem. Both must be safe to run.
     */
    serverRows.push(wordNamed("established"));

    await mountedLibrary();

    await act(async () => {
      announceWordSaved(wordNamed("lamp"));
      announceWordSaved(wordNamed("lamp"));
    });

    expect(screen.getAllByText("lamp")).toHaveLength(1);
  });

  it("stops listening once the library is gone", async () => {
    // A provider torn down and announced at must not write to dead state.
    const { unmount } = render(
      <VocabularyProvider>
        <Library />
      </VocabularyProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("library")).toBeTruthy());
    unmount();

    expect(() => announceWordSaved(wordNamed("lamp"))).not.toThrow();
  });
});

describe("the announcement itself", () => {
  it("reaches a listener and stops when it unsubscribes", () => {
    const heard: string[] = [];
    const stop = subscribeToSavedWords((item) => heard.push(item.word));

    announceWordSaved(wordNamed("first"));
    stop();
    announceWordSaved(wordNamed("second"));

    expect(heard).toEqual(["first"]);
  });

  it("survives a listener that throws, and still tells the others", () => {
    /*
     * The row is already in the database by the time this runs. A screen's
     * render bug turning into "could not save that word" — for a word that
     * was saved — is worse than the stale list this replaces.
     */
    vi.spyOn(console, "error").mockImplementation(() => {});

    const heard: string[] = [];
    const stopBad = subscribeToSavedWords(() => {
      throw new Error("a screen blew up");
    });
    const stopGood = subscribeToSavedWords((item) => heard.push(item.word));

    expect(() => announceWordSaved(wordNamed("lamp"))).not.toThrow();
    expect(heard).toEqual(["lamp"]);

    stopBad();
    stopGood();
  });
});

describe("the one door every save goes through", () => {
  it("announces the word it just wrote", async () => {
    /*
     * The wiring the four broken screens depend on. They call
     * createVocabularyEntry and nothing else; if the announcement is not
     * made here, no amount of listening in the provider helps them.
     */
    const heard: string[] = [];
    const stop = subscribeToSavedWords((item) => heard.push(item.word));

    await createVocabularyEntry({
      userId: USER.id,
      term: "lamp",
      translation: "檯燈",
      termExample: "I left the lamp on all night.",
      translationExample: "我整晚都開著檯燈。",
      knownItems: [],
      language: { pair: ["en", "zh-TW"] },
    });

    stop();

    expect(heard).toEqual(["lamp"]);
  });

  it("announces the saved row, not the caller's arguments", async () => {
    // The listener puts this straight into the list, so it has to be the row
    // the database returned — with its id — and not the draft.
    const heard: Array<{ id: string }> = [];
    const stop = subscribeToSavedWords((item) => heard.push({ id: item.id }));

    await createVocabularyEntry({
      userId: USER.id,
      term: "charger",
      translation: "充電器",
      knownItems: [],
      language: { pair: ["en", "zh-TW"] },
    });

    stop();

    expect(heard).toEqual([{ id: "saved-1" }]);
  });

  it("reaches the library on screen, end to end", async () => {
    /*
     * The reported bug, start to finish: a library is open, a word is saved
     * the way the camera saves it, and the server list never changes.
     */
    serverRows.push(wordNamed("established"));

    await mountedLibrary();

    await act(async () => {
      await createVocabularyEntry({
        userId: USER.id,
        term: "mug",
        translation: "馬克杯",
        knownItems: [],
        language: { pair: ["en", "zh-TW"] },
      });
    });

    expect(screen.getByText("mug")).toBeTruthy();
  });
});
