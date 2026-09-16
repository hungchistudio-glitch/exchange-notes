import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import NoteCard from "@/components/notes/NoteCard";
import type { Note } from "@/lib/notes/repository";

const note: Note = {
  id: "date-review", ownerId: "reader", originalText: "Keep this moment.",
  originalLanguage: "en", personalMeaning: "", context: "", tags: [],
  privacy: "private", sourceKind: "manual", sourceName: null, sourceUrl: null,
  sourceNoteId: null, sourceOwnerId: null, sourceOwnerName: null,
  createdAt: "2026-09-15T00:30:00.000Z", updatedAt: "2026-09-15T00:30:00.000Z",
  interpretations: [], isSharedWithMe: false,
};

describe("note dates across server and browser locales", () => {
  it("hydrates without replacing the card and then shows the reader's date", async () => {
    const DateTimeFormat = Intl.DateTimeFormat;
    let formattedDate = "Sep 15";
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locales, options) {
      const formatter = new DateTimeFormat(locales, options);
      Object.defineProperty(formatter, "format", { value: () => formattedDate });
      return formatter;
    });
    const container = document.createElement("div");
    container.innerHTML = renderToString(<NoteCard note={note} />);
    document.body.append(container);
    const originalLink = container.querySelector("a");
    const onRecoverableError = vi.fn();
    // A browser west of UTC can also be on the previous date.
    formattedDate = "14 Sept";
    let root: ReturnType<typeof hydrateRoot>;

    await act(async () => {
      root = hydrateRoot(container, <NoteCard note={note} />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("a")).toBe(originalLink);
    expect(container).toHaveTextContent("14 Sept");
    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps an invalid date from breaking access to the note", () => {
    render(<NoteCard note={{ ...note, createdAt: "invalid" }} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/notes/date-review");
    expect(screen.getByRole("link")).not.toHaveTextContent("Invalid Date");
  });
});
