import { useLayoutEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularyItem } from "@/lib/types/app";
import type { PendingMutation } from "@/lib/offline/vocabulary";
import { applyLanguageFill } from "@/lib/vocabulary/applyLanguageFill";

const state = vi.hoisted(() => ({
  fetch: vi.fn(), sweep: vi.fn(), mirror: vi.fn(),
  pending: [] as PendingMutation[], local: [] as VocabularyItem[],
  auth: null as null | ((event: string, session?: { user: { id: string } }) => void),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  auth: {
    getSession: async () => ({ data: { session: { user: { id: "reader" } } } }),
    onAuthStateChange: (cb: typeof state.auth) => { state.auth = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { learning_language: "en" } }) }) }) }),
}) }));
vi.mock("@/lib/vocabulary/repository", () => ({ getCurrentUser: async () => ({ user: { id: "reader" } }), fetchVocabulary: state.fetch }));
vi.mock("@/lib/offline/vocabulary", async original => ({
  ...await original<typeof import("@/lib/offline/vocabulary")>(),
  readMirror: async () => state.local, readOutbox: async () => state.pending,
  writeMirror: state.mirror, forgetMirror: vi.fn(),
}));
vi.mock("@/lib/offline/sync", () => ({ flushOutbox: async () => ({ sent: 0, remaining: state.pending.length }) }));
vi.mock("@/lib/offline/forgetDevice", () => ({ forgetDeviceCopies: vi.fn() }));
vi.mock("@/lib/media/orphanSweep", () => ({ sweepOrphans: state.sweep }));
vi.mock("@/hooks/useVocabularyLanguageFill", () => ({ useVocabularyLanguageFill: () => ({ filling: false }) }));
import { VocabularyProvider, useVocabulary } from "@/contexts/VocabularyContext";
let library: ReturnType<typeof useVocabulary>;
function View() {
  const current = useVocabulary();
  useLayoutEffect(() => { library = current; }, [current]);
  return <div>{current.loading ? "loading" : current.items.map(item => item.word).join(",")}</div>;
}
const word = (id: string) => ({ id, word: id, user_id: "reader", texts: { en: id }, examples: {}, created_at: "2026-10-01" }) as VocabularyItem;
beforeEach(() => { vi.clearAllMocks(); state.pending = []; state.local = []; state.fetch.mockResolvedValue([word("apple")]); });

describe("library refresh safety", () => {
  it("overlays offline inserts, edits and deletes on a successful server read", async () => {
    state.fetch.mockResolvedValue([word("apple"), word("pear")]);
    state.pending = [
      { kind: "insert", at: "", item: word("banana") },
      { kind: "delete", at: "", itemId: "pear" },
      { kind: "fields", at: "", itemId: "apple", fields: { word: "edited" } as never },
    ];
    render(<VocabularyProvider><View /></VocabularyProvider>);
    await waitFor(() => expect(library.loading).toBe(false));
    expect(library.items.map(item => item.word).sort()).toEqual(["banana", "edited"]);
    expect(state.sweep).not.toHaveBeenCalled();
  });
  it("does not reload the library for a token refresh or same-account sign-in", async () => {
    render(<VocabularyProvider><View /></VocabularyProvider>);
    await screen.findByText("apple");
    act(() => { state.auth!("TOKEN_REFRESHED", { user: { id: "reader" } }); state.auth!("SIGNED_IN", { user: { id: "reader" } }); });
    expect(state.fetch).toHaveBeenCalledOnce();
    expect(library.loading).toBe(false);
  });
  it("keeps a delete made while a background refresh is in flight", async () => {
    render(<VocabularyProvider><View /></VocabularyProvider>);
    await screen.findByText("apple");
    let finish!: (rows: VocabularyItem[]) => void;
    state.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    let refreshing!: Promise<void>;
    act(() => { refreshing = library.refresh(); });
    await waitFor(() => expect(state.fetch).toHaveBeenCalledTimes(2));
    act(() => library.removeItem("apple"));
    await act(async () => { finish([word("apple")]); await refreshing; });
    expect(library.items).toEqual([]);
  });
  it("rejects a response that arrives after sign-out", async () => {
    let finish!: (rows: VocabularyItem[]) => void;
    state.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<VocabularyProvider><View /></VocabularyProvider>);
    await waitFor(() => expect(state.fetch).toHaveBeenCalledOnce());
    act(() => state.auth!("SIGNED_OUT"));
    await act(async () => { finish([word("apple")]); });
    expect(library.items).toEqual([]);
    expect(state.mirror).not.toHaveBeenCalled();
  });
});

it("does not apply an old translation to a word edited while the answer was in flight", () => {
  const edited = { ...word("apple"), texts: { en: "pear" } };
  const patch = { id: "apple", texts: { en: "apple", fr: "pomme" }, examples: {}, basedOnTexts: { en: "apple" } };
  expect(applyLanguageFill(edited, patch)).toBe(edited);
  expect(applyLanguageFill(word("apple"), patch).texts).toEqual({ en: "apple", fr: "pomme" });
});
