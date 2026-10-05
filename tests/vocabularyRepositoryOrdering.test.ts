import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ pending: vi.fn(), queue: vi.fn(), from: vi.fn(), flush: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: m.from }) }));
vi.mock("@/lib/offline/vocabulary", () => ({ readOutbox: m.pending, queueMutation: m.queue, draftVocabularyItem: vi.fn() }));
vi.mock("@/lib/offline/sync", () => ({ flushOutbox: m.flush }));
import { fetchVocabulary, updateVocabularyFields, deleteVocabulary } from "@/lib/vocabulary/repository";
beforeEach(() => { vi.clearAllMocks(); m.pending.mockResolvedValue([]); m.queue.mockResolvedValue(undefined); });
it("queues an edit and delete behind an offline insert instead of sending them too early", async () => {
  m.pending.mockResolvedValue([{ kind: "insert", item: { id: "word" } }]);
  await updateVocabularyFields("word", { word: "corrected" } as never);
  await deleteVocabulary("word");
  expect(m.from).not.toHaveBeenCalled();
  expect(m.queue.mock.calls.map(([value]) => value.kind)).toEqual(["fields", "delete"]);
});
it("reads a library beyond the API's default row limit", async () => {
  const page = Array.from({ length: 500 }, (_, i) => ({ id: String(i) }));
  const range = vi.fn().mockResolvedValueOnce({ data: page, error: null }).mockResolvedValueOnce({ data: [{ id: "last" }], error: null });
  const q = { select: () => q, eq: () => q, order: () => q, range };
  m.from.mockReturnValue(q);
  const result = await fetchVocabulary("reader");
  expect(result).toHaveLength(501);
  expect(range.mock.calls).toEqual([[0, 499], [500, 999]]);
});
