import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { harness, renderInLab, resetHarness } from "./harness";
vi.mock("@/components/pronunciation/lab/SpeakTrainer", () => ({ default: ({ targetText, onAttempt }: { targetText: string; onAttempt: (outcome: string, score: number) => void }) => <button data-testid="practice-target" onClick={() => onAttempt("correct", 100)}>{targetText}</button> }));
import SpeakModule from "@/components/pronunciation/lab/SpeakModule";
it("keeps the practiced target when the score updates its weakness rank", async () => {
  resetHarness();
  await renderInLab(<SpeakModule />);
  const target = await screen.findByTestId("practice-target");
  const text = target.textContent;
  fireEvent.click(target);
  await waitFor(() => expect(harness.attempts).toHaveLength(1));
  expect(screen.getByTestId("practice-target").textContent).toBe(text);
});
