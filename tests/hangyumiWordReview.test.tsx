import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HangyumiWordReview from "@/components/hangyumi/HangyumiWordReview";
import { NotReviewerError, readReviewWords, type ReviewStatus, type ReviewWord, type WordReview } from "@/lib/hangyumi/review";

/* =========================================================
   Approving Hangyumi's words

   Only approved words are dealt, and a level shows how many it still
   lacks. The bank is the server's; here it is a list in memory.
   ========================================================= */

function word(id: string, answer: string, level: ReviewWord["level"] = "B1", status: ReviewStatus = "draft"): ReviewWord {
  return { id, language: "en", level, answer, partOfSpeech: "noun", clues: { en: `${answer}, explained`, "zh-TW": "說明" }, source: "Oxford 3000", status };
}

function fakeReview(words: ReviewWord[], fail = false) {
  const set = vi.fn(async (ids: string[], status: ReviewStatus) => {
    if (fail) throw new Error("offline");
    void status;
    return ids.length;
  });
  const review: WordReview = { list: vi.fn(async () => words), set };
  return { review, set };
}

describe("the word bank's review page", () => {
  it("shows each level's shortfall and approves one word", async () => {
    const { review, set } = fakeReview([word("1", "journey"), word("2", "bridge", "B1", "approved"), word("3", "ubiquitous", "C1")]);
    render(<HangyumiWordReview review={review} />);
    expect(await screen.findByText("1 approved · 2 drafts · 0 rejected")).toBeInTheDocument();
    const b1 = screen.getByRole("button", { name: /B1/ });
    expect(within(b1).getByText("1/30")).toBeInTheDocument();
    expect(within(b1).getByText("29 more needed")).toBeInTheDocument();

    const journey = screen.getByText("journey").closest("li")!;
    fireEvent.click(within(journey).getByRole("button", { name: "Approve" }));
    expect(set).toHaveBeenCalledWith(["1"], "approved");
    await waitFor(() => expect(within(journey).getByText("Approved")).toBeInTheDocument());
    expect(screen.getByText("2 approved · 1 drafts · 0 rejected")).toBeInTheDocument();
    // C1's word is not in B1's list.
    expect(screen.queryByText("ubiquitous")).toBeNull();
  });

  it("approves the drafts in view together", async () => {
    const { review, set } = fakeReview([word("1", "journey"), word("2", "bridge"), word("3", "island", "B1", "rejected")]);
    render(<HangyumiWordReview review={review} />);
    fireEvent.click(await screen.findByRole("button", { name: "Approve the 2 drafts here" }));
    expect(set).toHaveBeenCalledWith(["1", "2"], "approved");
    expect(await screen.findByRole("button", { name: "Approve the 0 drafts here" })).toBeDisabled();
  });

  it("puts a word back when the save fails", async () => {
    const { review } = fakeReview([word("1", "journey")], true);
    render(<HangyumiWordReview review={review} />);
    const journey = (await screen.findByText("journey")).closest("li")!;
    fireEvent.click(within(journey).getByRole("button", { name: "Reject" }));
    expect(await screen.findByText("That didn't save. Try again.")).toBeInTheDocument();
    expect(within(journey).getByText("Draft")).toBeInTheDocument();
  });

  it("tells anyone but a reviewer that the page is not theirs", async () => {
    const review: WordReview = { list: vi.fn(async () => { throw new NotReviewerError(); }), set: vi.fn() };
    render(<HangyumiWordReview review={review} />);
    expect(await screen.findByText("Only a word reviewer can open this page.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve/ })).toBeNull();
  });

  it("reads only well-formed rows from the server", () => {
    expect(readReviewWords([{ id: "1", answer: "x", level: "B1", language: "en", status: "approved" }, { id: 2 }, null])).toHaveLength(1);
    expect(readReviewWords("nope")).toEqual([]);
  });
});
