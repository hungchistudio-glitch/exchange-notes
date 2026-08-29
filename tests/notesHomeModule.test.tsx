import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({
  createNote: vi.fn(),
  fetchNotes: vi.fn(),
  importLegacyNotes: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
  }),
}));

vi.mock("@/lib/notes/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notes/repository")>();
  return {
    ...actual,
    createNote: controls.createNote,
    fetchNotes: controls.fetchNotes,
    importLegacyNotes: controls.importLegacyNotes,
  };
});

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { default: NotesHomeModule } = await import("@/components/notes/NotesHomeModule");

describe("the compact Home notes module", () => {
  beforeEach(() => {
    controls.createNote.mockReset();
    controls.fetchNotes.mockReset().mockResolvedValue([]);
    controls.importLegacyNotes.mockReset().mockResolvedValue(0);
  });

  it("opens one original-note composer and auto-detects its language", async () => {
    vi.useFakeTimers();
    render(<NotesHomeModule />);
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();

    fireEvent.click(await screen.findByRole("button", { name: "New note" }));
    expect(await screen.findByRole("dialog", { name: "New note" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(5);

    fireEvent.change(screen.getByPlaceholderText("Write a word, sentence, or thought…"), {
      target: { value: "把這一刻留下來" },
    });
    expect(screen.getByRole("combobox")).toHaveValue("zh-TW");
  });

  it("saves one canonical note instead of five copies", async () => {
    controls.createNote.mockResolvedValue({
      id: "saved-note",
      ownerId: "user-1",
      originalText: "Bonjour et merci pour cette journée",
      originalLanguage: "fr",
      personalMeaning: "",
      context: "",
      tags: [],
      privacy: "private",
      sourceKind: "manual",
      sourceName: null,
      sourceUrl: null,
      sourceNoteId: null,
      sourceOwnerId: null,
      sourceOwnerName: null,
      createdAt: "2026-08-29T00:00:00.000Z",
      updatedAt: "2026-08-29T00:00:00.000Z",
      interpretations: [],
      isSharedWithMe: false,
    });
    render(<NotesHomeModule />);

    fireEvent.click(await screen.findByRole("button", { name: "New note" }));
    fireEvent.change(await screen.findByPlaceholderText("Write a word, sentence, or thought…"), {
      target: { value: "Bonjour et merci pour cette journée" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(controls.createNote).toHaveBeenCalledTimes(1));
    expect(controls.createNote.mock.calls[0][2]).toMatchObject({
      originalText: "Bonjour et merci pour cette journée",
      originalLanguage: "fr",
      privacy: "private",
    });
  });
});
