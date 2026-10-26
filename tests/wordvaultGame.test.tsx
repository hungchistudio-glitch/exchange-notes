import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HangyumiGame from "@/components/hangyumi/HangyumiGame";
import type { HangyumiRound } from "@/lib/hangyumi/rules";
import { createPreviewHangyumi, type HangyumiService, type PracticeWord } from "@/lib/hangyumi/service";

/* =========================================================
   Yumi Wordvault, the screen: Hangyumi's own (components/hangyumi/
   HangyumiGame), playing `game="wordvault"`. Its stage is WebGL, which
   jsdom does not have, so it is a stub that reports what it was handed.
   ========================================================= */

const reader = vi.hoisted(() => ({ language: "english" as "english" | "traditional-chinese" }));
vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => reader.language }));
vi.mock("@/lib/speech", () => ({ speak: vi.fn(), speechSupported: () => true, stopSpeech: vi.fn() }));
vi.mock("@/hooks/usePhonetics", () => ({ default: () => () => undefined }));
vi.mock("@/components/hangyumi/HangyumiStage", () => ({
  default: () => <div data-testid="gallows" />,
}));
vi.mock("@/components/wordvault/WordvaultStage", () => ({
  default: ({ round, outfit, label }: { round: HangyumiRound | null; outfit: unknown; label: string }) => (
    <div data-testid="vault" data-round={round?.id ?? ""} data-guessed={round?.guessed.join("") ?? ""} data-outfit={JSON.stringify(outfit)} aria-label={label} />
  ),
}));
vi.mock("@/components/shop/EnergyCookie", () => ({ default: () => <span aria-hidden="true" /> }));

const WORDS: PracticeWord[] = [
  { language: "fr", level: "C1", answer: "éphémère", partOfSpeech: "adj", clues: { en: "lasting a very short time" } },
  { language: "en", level: "C1", answer: "candid", partOfSpeech: "adj", clues: { en: "honest and direct" } },
];

function play(service: HangyumiService = createPreviewHangyumi({ words: WORDS, delayMs: 0 })) {
  const loadWallet = vi.fn(async () => ({ outfit: { head: "beret" }, balance: 240 }));
  render(<HangyumiGame service={service} defaultLanguage="fr" loadWallet={loadWallet} game="wordvault" />);
  return { service };
}

async function guess(char: string) {
  const button = await screen.findByRole("button", { name: `Guess ${char}` });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await waitFor(() => expect(
    screen.queryByRole("button", { name: `${char}, already guessed` }) ?? screen.queryByRole("button", { name: "Next word" }),
  ).toBeInTheDocument());
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("hangyumi-level", "C1");
});
afterEach(() => { reader.language = "english"; });

describe("Yumi Wordvault", () => {
  it("is Hangyumi's screen with its own sign, stage and words", async () => {
    play();
    expect(await screen.findByText("lasting a very short time")).toBeInTheDocument();
    // The full name is the heading; the sign, where it would not fit, says Wordvault.
    expect(screen.getByRole("heading", { level: 1, name: /Yumi Wordvault/ })).toBeInTheDocument();
    expect(screen.getByText("Wordvault")).toBeInTheDocument();
    expect(screen.queryByTestId("gallows")).toBeNull();
    // Yumi wears her own clothes from the start, not only once the word is won.
    await waitFor(() => expect(screen.getByTestId("vault")).toHaveAttribute("data-outfit", JSON.stringify({ head: "beret" })));
    expect(screen.getByTestId("vault")).toHaveAttribute("aria-label", "Yumi on the path to the chest: 0 of 3 copies sent out");
    fireEvent.click(screen.getByRole("button", { name: "How Yumi Wordvault works" }));
    expect(await screen.findByText(/shared with Hangyumi/)).toBeInTheDocument();
  });

  it("sends out her U, then I, then O", async () => {
    play();
    await screen.findByText("lasting a very short time");
    const chips = () => Array.from(document.querySelectorAll("[data-piece]"));
    expect(chips().map(chip => chip.textContent)).toEqual(["U", "I", "O"]);
    await guess("z");
    expect(chips().map(chip => chip.getAttribute("data-hung"))).toEqual(["true", "false", "false"]);
    expect(screen.getByTestId("vault")).toHaveAttribute("aria-label", "Yumi on the path to the chest: 1 of 3 copies sent out");
  });

  it("opens the vault when the word is found, and pays as Hangyumi does", async () => {
    play();
    await screen.findByText("lasting a very short time");
    for (const char of ["é", "p", "h", "m", "è", "r", "e"]) await guess(char);
    expect(await screen.findByRole("heading", { name: "The vault opens!" })).toBeInTheDocument();
    expect(screen.getByText("90 cookies this round.")).toBeInTheDocument();
    expect(screen.getByText("Word bonus +27")).toBeInTheDocument();
  });

  it("keeps its own word in progress, apart from Hangyumi's, at the same language and level", async () => {
    window.localStorage.setItem("hangyumi-round:fr:C1", "a-hangyumi-round");
    play();
    await screen.findByText("lasting a very short time");
    const id = window.localStorage.getItem("wordvault-round:fr:C1");
    expect(id).toBeTruthy();
    expect(id).not.toBe("a-hangyumi-round");
    expect(screen.getByTestId("vault")).toHaveAttribute("data-round", id);
    expect(window.localStorage.getItem("hangyumi-round:fr:C1")).toBe("a-hangyumi-round");
  });
});

describe("a guess answered after the reader moved on", () => {
  it("never replaces the new language's word with the old one's", async () => {
    const base = createPreviewHangyumi({ words: WORDS, delayMs: 0 });
    let release: (() => void) | null = null;
    const service: HangyumiService = {
      ...base,
      guess: (id, letter) => new Promise(resolve => { release = () => resolve(base.guess(id, letter)); }),
    };
    play(service);
    await screen.findByText("lasting a very short time");
    fireEvent.click(screen.getByRole("button", { name: "Guess é" }));
    await waitFor(() => expect(release).not.toBeNull());
    // While it is out, the reader switches to English.
    fireEvent.click(screen.getByRole("button", { name: "Learning language: French" }));
    fireEvent.click(await screen.findByRole("radio", { name: /English/ }));
    expect(await screen.findByText("honest and direct")).toBeInTheDocument();
    release!();
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(screen.getByText("honest and direct")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "The word" })).getAllByText("a hidden letter")).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "Guess é" })).toBeNull();
  });
});
