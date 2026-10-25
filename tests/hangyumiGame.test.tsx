import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HangyumiGame from "@/components/hangyumi/HangyumiGame";
import { createPreviewHangyumi, type PracticeWord } from "@/lib/hangyumi/service";

/* =========================================================
   Hangyumi, the screen

   Played against the in-memory service the review screen uses, which
   keeps the server's rules. The studio is WebGL, which jsdom does not
   have, so it is a stub that reports the pose it was handed.
   ========================================================= */

const speech = vi.hoisted(() => ({ speak: vi.fn() }));
vi.mock("@/lib/speech", () => ({ speak: speech.speak, speechSupported: () => true }));
vi.mock("@/components/hangyumi/HangyumiStage", () => ({
  default: ({ misses, status, outfit, label }: { misses: number; status: string; outfit: unknown; label: string }) => (
    <div data-testid="stage" data-misses={misses} data-status={status} data-outfit={JSON.stringify(outfit)} aria-label={label} />
  ),
}));
vi.mock("@/components/shop/EnergyCookie", () => ({ default: () => <span aria-hidden="true" /> }));

const WORDS: PracticeWord[] = [
  { language: "fr", level: "C1", answer: "éphémère", partOfSpeech: "adj", clues: { en: "lasting a very short time", "zh-TW": "只存在很短的時間" } },
  { language: "fr", level: "B1", answer: "fête", partOfSpeech: "noun", clues: { en: "a party", "zh-TW": "派對" } },
  { language: "zh-TW", level: "B1", answer: "旅行", partOfSpeech: "noun", clues: { en: "a trip for pleasure" } },
];

function play(options: { language?: "fr" | "zh-TW"; earnedToday?: number } = {}) {
  const service = createPreviewHangyumi({ words: WORDS, delayMs: 0, earnedToday: options.earnedToday });
  const loadOutfit = vi.fn(async () => ({ head: "beret" }));
  render(
    <HangyumiGame
      service={service}
      defaultLanguage={options.language ?? "fr"}
      nativeLanguage={options.language === "zh-TW" ? "en" : "zh-TW"}
      loadOutfit={loadOutfit}
    />,
  );
  return { service, loadOutfit };
}

const key = (char: string) => screen.getByRole("button", { name: `Guess ${char}` });
async function guess(char: string) {
  const button = await screen.findByRole("button", { name: `Guess ${char}` });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  // Taken, or the round is over and the keyboard has given way to the result.
  await waitFor(() => expect(
    screen.queryByRole("button", { name: `${char}, already guessed` }) ?? screen.queryByRole("button", { name: "Next word" }),
  ).toBeInTheDocument());
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("hangyumi-level", "C1");
});
afterEach(() => speech.speak.mockReset());

describe("a round of Hangyumi", () => {
  it("deals a word in the level chosen, with its clue in the reader's language and no answer", async () => {
    play();
    expect(await screen.findByText("只存在很短的時間")).toBeInTheDocument();
    // The difficulty is one chip until it is tapped.
    const chip = screen.getByRole("button", { name: "Difficulty C1" });
    expect(chip).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Difficulty B1" })).toBeNull();
    fireEvent.click(chip);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: "Difficulty C1" })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("radiogroup", { name: "Difficulty" })).toBeNull();
    expect(screen.getByText("adjective")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "The word" })).getAllByText("a hidden letter")).toHaveLength(8);
    expect(screen.queryByText("éphémère")).toBeNull();
    // French has its accents as keys of their own.
    expect(key("é")).toBeInTheDocument();
    expect(key("è")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/home");
  });

  it("hangs a piece for each wrong guess and reveals every place a right one goes", async () => {
    play();
    await screen.findByText("只存在很短的時間");
    await guess("z");
    expect(screen.getByTestId("stage")).toHaveAttribute("data-misses", "1");
    expect(screen.getByText("2 wrong guesses left")).toBeInTheDocument();
    await guess("é");
    const word = screen.getByRole("group", { name: "The word" });
    expect(within(word).getAllByText("é")).toHaveLength(2);
    expect(within(word).queryByText("e")).toBeNull();
    expect(screen.getByText("+9 this round")).toBeInTheDocument();
  });

  it("frees Yumi on the last letter, dresses her, pays the bonus and says the word", async () => {
    const { loadOutfit } = play();
    await screen.findByText("只存在很短的時間");
    for (const char of ["é", "p", "h", "m", "è", "r", "e"]) await guess(char);
    expect(await screen.findByRole("heading", { name: "You freed Yumi!" })).toBeInTheDocument();
    expect(screen.getByText("90 cookies this round.")).toBeInTheDocument();
    expect(screen.getByText("Word bonus +27")).toBeInTheDocument();
    expect(screen.getByTestId("stage")).toHaveAttribute("data-status", "won");
    expect(loadOutfit).toHaveBeenCalled();
    expect(screen.getByTestId("stage")).toHaveAttribute("data-outfit", JSON.stringify({ head: "beret" }));
    expect(speech.speak).toHaveBeenCalledWith("éphémère", "fr-FR");
    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
    // Today's count moves once the cookies have landed.
    expect(await screen.findByText("90 of 333 cookies today", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("ends on the third miss and keeps what was won", async () => {
    play();
    await screen.findByText("只存在很短的時間");
    await guess("p");
    for (const char of ["x", "y", "z"]) await guess(char);
    expect(await screen.findByRole("heading", { name: "Yumi is hung" })).toBeInTheDocument();
    expect(screen.getByText("You keep the 9 cookies you won.")).toBeInTheDocument();
    expect(screen.getByText("éphémère")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guess a" })).toBeNull();
  });

  it("pays only what is left of today's 333", async () => {
    play({ earnedToday: 331 });
    await screen.findByText("只存在很短的時間");
    await guess("é");
    expect(await screen.findByText("Only 2 left today, so that is what it paid.")).toBeInTheDocument();
  });

  it("finishes the word in hand before changing level, and says so", async () => {
    play();
    await screen.findByText("只存在很短的時間");
    await guess("z");
    fireEvent.click(screen.getByRole("button", { name: "Difficulty C1" }));
    fireEvent.click(screen.getByRole("radio", { name: "Difficulty B1" }));
    expect(screen.getByText("The next word will be B1.")).toBeInTheDocument();
    // Folded again, the chip shows what comes next.
    expect(screen.getByRole("button", { name: "Difficulty B1" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("只存在很短的時間")).toBeInTheDocument();
  });

  it("says when a level has no approved words, and never deals another level", async () => {
    window.localStorage.setItem("hangyumi-level", "C2");
    play();
    expect(await screen.findByText("No C2 words in French have been approved yet.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Letters" })).toBeNull();
  });

  it("takes letters from a real keyboard too", async () => {
    play();
    await screen.findByText("只存在很短的時間");
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "P" }));
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "p, already guessed" })).toBeInTheDocument());
  });

  it("switches the language it deals in, and only that", async () => {
    play();
    await screen.findByText("只存在很短的時間");
    fireEvent.click(screen.getByRole("button", { name: "Learning language: French" }));
    fireEvent.click(await screen.findByRole("radio", { name: /中文/ }));
    expect(window.localStorage.getItem("hangyumi-language")).toBe("zh-TW");
    // Chinese at C1 has no practice word: it says so rather than falling back.
    expect(await screen.findByText(/No C1 words in .* have been approved yet\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Difficulty C1" }));
    fireEvent.click(screen.getByRole("radio", { name: "Difficulty B1" }));
    // Played in the reader's own language, the clue moves to another one.
    expect(await screen.findByText("a trip for pleasure")).toBeInTheDocument();
  });

  it("guesses Chinese from a set of characters that holds the answer's", async () => {
    window.localStorage.setItem("hangyumi-level", "B1");
    play({ language: "zh-TW" });
    expect(await screen.findByText("a trip for pleasure")).toBeInTheDocument();
    const keys = within(screen.getByRole("group", { name: "Characters" })).getAllByRole("button");
    expect(keys).toHaveLength(16);
    expect(keys.map(button => button.textContent)).toEqual(expect.arrayContaining(["旅", "行"]));
    await guess("旅");
    await guess("行");
    expect(await screen.findByRole("heading", { name: "You freed Yumi!" })).toBeInTheDocument();
  });
});
