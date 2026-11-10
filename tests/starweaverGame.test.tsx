import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HangyumiGame from "@/components/hangyumi/HangyumiGame";
import StarweaverStage from "@/components/starweaver/StarweaverStage";
import { readRound, revealProgress, type HangyumiRound } from "@/lib/hangyumi/rules";
import { createPreviewHangyumi, createSupabaseHangyumi, type HangyumiService, type PracticeWord } from "@/lib/hangyumi/service";
import { MYTHIC_ITEMS } from "@/lib/shop/mythicCollection";
import { STARWEAVER_ITEMS, isStarweaver } from "@/lib/shop/starweaverCollection";
import { createPreviewWallet } from "@/lib/shop/wallet";
import { progress as vaultProgress } from "@/lib/wordvault/presentation";

/* =========================================================
   Yumi Starweaver｜織星者, the screen (Chi, 2026-11-10): Hangyumi's own
   (components/hangyumi/HangyumiGame) playing `game="starweaver"`, against
   the in-memory service that follows the server's rules. Every seventh
   word won brings back a relic; the server decides it, the page shows it.
   The database's side is supabase/tests/starweaver.sql.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));
vi.mock("@/lib/speech", () => ({ speak: vi.fn(), speechSupported: () => true, stopSpeech: vi.fn() }));
vi.mock("@/hooks/usePhonetics", () => ({ default: () => () => undefined }));
vi.mock("@/components/hangyumi/HangyumiStage", () => ({ default: () => <div data-testid="gallows" /> }));
vi.mock("@/components/wordvault/WordvaultStage", () => ({ default: () => <div data-testid="vault" /> }));
vi.mock("@/components/shop/EnergyCookie", () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock("@/components/shop/ShopThumb", () => ({ default: ({ item }: { item: { id: string } }) => <span data-testid="thumb" data-item={item.id} /> }));

const WORDS: PracticeWord[] = [
  { language: "en", level: "B1", answer: "apple", partOfSpeech: "noun", clues: { en: "a round fruit" } },
  { language: "en", level: "B1", answer: "candid", partOfSpeech: "adj", clues: { en: "honest and direct" } },
];

const service = (options: Parameters<typeof createPreviewHangyumi>[0] = {}) =>
  createPreviewHangyumi({ words: WORDS, delayMs: 0, ...options });

function play(svc: HangyumiService, wearPiece = vi.fn(async (id: string) => ({ earrings: id }))) {
  const loadWallet = vi.fn(async () => ({ outfit: { head: "beret" }, balance: 240 }));
  render(<HangyumiGame service={svc} defaultLanguage="en" loadWallet={loadWallet} game="starweaver" wearPiece={wearPiece} />);
  return { wearPiece };
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
  window.localStorage.setItem("hangyumi-level", "B1");
});
afterEach(() => vi.restoreAllMocks());

describe("the round's rules", () => {
  it("reads Starweaver's voyages off a round, and never a chest", () => {
    const round = readRound({
      id: "r", status: "won", language: "en", level: "B1", game: "starweaver", slots: [], guessed: [],
      chestReward: null,
      starweaver: { completedTotal: 7, cycleProgress: 0, cycleLength: 7, collectedCount: 1, collectionSize: 17, collectionComplete: false, award: { id: 1, itemId: "sw-orbit-drop" } },
    });
    expect(round.game).toBe("starweaver");
    expect(round.chestReward).toBeNull();
    expect(round.starweaver).toMatchObject({ completedTotal: 7, cycleProgress: 0, award: { id: 1, itemId: "sw-orbit-drop" } });
  });

  it("shows no award while a word is still being guessed", () => {
    const round = readRound({
      id: "r", status: "playing", language: "en", level: "B1", game: "starweaver", slots: [], guessed: [],
      starweaver: { completedTotal: 6, cycleProgress: 6, cycleLength: 7, award: { id: 1, itemId: "sw-orbit-drop" } },
    });
    expect(round.starweaver?.award).toBeNull();
  });

  it("an unknown game is Hangyumi, as before", () => {
    expect(readRound({ id: "r", language: "en", level: "B1", game: "chess" }).game).toBe("hangyumi");
  });

  it("counts progress the same for every stage: places filled, not letters, and not punctuation", () => {
    const round = {
      slots: [
        { letter: true, char: "a" }, { letter: true, char: "p" }, { letter: true, char: "p" },
        { letter: false, char: "-" }, { letter: true, char: null },
      ],
      guessed: ["p"],
    };
    expect(revealProgress(round)).toEqual({ total: 4, revealed: 2, fraction: 0.5 });
    expect(vaultProgress(round as HangyumiRound)).toEqual(revealProgress(round));
  });

  it("asks the server for the game by name, and never for Hangyumi", async () => {
    const rpc = vi.fn(async () => ({ data: { status: "missing", language: "en", level: "B1" }, error: null }));
    const live = createSupabaseHangyumi({ rpc } as never);
    await live.start({ roundId: "a", language: "en", level: "B1", hintLanguage: "en", game: "starweaver" });
    await live.start({ roundId: "b", language: "en", level: "B1", hintLanguage: "en" });
    expect(rpc).toHaveBeenNthCalledWith(1, "hangyumi_start", expect.objectContaining({ p_game: "starweaver" }));
    expect(rpc.mock.calls[1]).toEqual(["hangyumi_start", expect.not.objectContaining({ p_game: expect.anything() })]);
  });
});

describe("voyages in the preview service, as the server counts them", () => {
  async function win(svc: HangyumiService, id: string) {
    const start = await svc.start({ roundId: id, language: "en", level: "B1", hintLanguage: "en", game: "starweaver" });
    if (start.status === "missing") throw new Error("missing");
    let last = start;
    for (const char of new Set([...(WORDS.find(w => start.hint === w.clues.en)!.answer)])) {
      last = await svc.guess(id, char);
    }
    return last;
  }

  it("brings back a relic on the seventh, from the 17 only, and counts a resend once", async () => {
    const svc = service({ voyages: 6, owned: MYTHIC_ITEMS.map(item => item.id) });
    const seventh = await win(svc, "seven");
    expect(seventh.starweaver?.completedTotal).toBe(7);
    expect(seventh.starweaver?.cycleProgress).toBe(0);
    expect(isStarweaver(seventh.starweaver?.award?.itemId)).toBe(true);
    const again = await svc.guess("seven", "a");
    expect(again.repeat).toBe(true);
    expect(again.starweaver?.completedTotal).toBe(7);
    expect(again.starweaver?.collectedCount).toBe(1);
  });

  it("takes nothing away for a loss", async () => {
    const svc = service({ voyages: 3 });
    await svc.start({ roundId: "l", language: "en", level: "B1", hintLanguage: "en", game: "starweaver" });
    let last;
    for (const char of ["x", "y", "z"]) last = await svc.guess("l", char);
    expect(last?.status).toBe("lost");
    expect(last?.starweaver?.completedTotal).toBe(3);
    expect(last?.starweaver?.award).toBeNull();
  });

  it("brings nothing more once all 17 are held", async () => {
    const svc = service({ voyages: 125, owned: STARWEAVER_ITEMS.map(item => item.id) });
    const won = await win(svc, "full");
    expect(won.starweaver?.completedTotal).toBe(126);
    expect(won.starweaver?.collectionComplete).toBe(true);
    expect(won.starweaver?.award).toBeNull();
  });
});

describe("the screen", () => {
  it("shows this voyage's place in its seven, and the relics held", async () => {
    play(service({ voyages: 4 }));
    const progress = await screen.findByRole("img", { name: /4 of 7 voyages towards the next relic; 0 of 17 relics found/ });
    expect(within(progress).getByText("Relics 0 / 17")).toBeInTheDocument();
  });

  it("on the seventh shows the relic it brought back, and puts it on when asked", async () => {
    const { wearPiece } = play(service({ voyages: 6, pick: ids => ids.includes("sw-orbit-drop") ? "sw-orbit-drop" : ids[0] }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    expect(await screen.findByText("The star gate opens!")).toBeInTheDocument();
    expect(screen.getByText("Brought back from the voyage")).toBeInTheDocument();
    expect(screen.getByText("Orbit Drop")).toBeInTheDocument();
    expect(screen.getByTestId("thumb")).toHaveAttribute("data-item", "sw-orbit-drop");
    fireEvent.click(screen.getByRole("button", { name: "Wear it" }));
    expect(wearPiece).toHaveBeenCalledWith("sw-orbit-drop");
    expect(await screen.findByRole("button", { name: "Wearing it" })).toBeDisabled();
  });

  it("carries on to the next word from the relic card", async () => {
    play(service({ voyages: 6 }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    fireEvent.click(await screen.findByRole("button", { name: "Carry on" }));
    expect(await screen.findByText("honest and direct")).toBeInTheDocument();
  });

  it("says nothing about relics on an ordinary word", async () => {
    play(service({ voyages: 1 }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    await screen.findByText("The star gate opens!");
    expect(screen.queryByText("Brought back from the voyage")).toBeNull();
    expect(screen.queryByRole("button", { name: "Wear it" })).toBeNull();
  });

  it("never shows Wordvault's streak or chests", async () => {
    play(service({ voyages: 3 }));
    await screen.findByText("a round fruit");
    expect(screen.queryByText(/in a row/)).toBeNull();
    expect(screen.queryByText(/chest/i)).toBeNull();
  });
});

describe("the flat star chart", () => {
  const round = (over: Partial<HangyumiRound>): HangyumiRound => readRound({
    id: "r", status: "playing", language: "en", level: "B1", game: "starweaver",
    slots: [{ letter: true, char: "a" }, { letter: true, char: "p" }, { letter: true, char: "p" }, { letter: true, char: null }, { letter: true, char: null }],
    guessed: ["a", "p"], misses: 0, ...over,
  } as never);

  it("lights one piece of track for each place filled", () => {
    const { container } = render(<StarweaverStage round={round({})} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    expect(container.querySelectorAll('path[data-lit="true"]')).toHaveLength(3);
    expect(container.querySelectorAll('path[data-lit="false"]')).toHaveLength(2);
  });

  it("sends out U, then I, then O, and opens the gate only for a word won", () => {
    const { container, rerender } = render(<StarweaverStage round={round({ misses: 2 })} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    const out = () => [...container.querySelectorAll('text[data-out="true"]')].map(node => node.textContent);
    expect(out()).toEqual(["U", "I"]);
    rerender(<StarweaverStage round={round({ status: "lost", misses: 3, slots: [{ letter: true, char: "a" }, { letter: true, char: "b" }] })} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-open", "false");
    expect(out()).toEqual([]);
    rerender(<StarweaverStage round={round({ status: "won", slots: [{ letter: true, char: "a" }] })} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-open", "true");
  });

  it("lets the page lay out once a word is dealt", async () => {
    const arrived = vi.fn();
    const { rerender } = render(<StarweaverStage round={null} outfit={null} dressed dealt={false} onArrived={arrived} label="chart" skipLabel="skip" />);
    expect(arrived).not.toHaveBeenCalled();
    await act(async () => {
      rerender(<StarweaverStage round={null} outfit={null} dressed dealt onArrived={arrived} label="chart" skipLabel="skip" />);
    });
    expect(arrived).toHaveBeenCalledTimes(1);
  });
});

describe("the wallet never sells a relic", () => {
  it("refuses to buy one, as the database does", async () => {
    const wallet = createPreviewWallet(100_000);
    await expect(wallet.buy("sw-orbit-drop")).rejects.toThrow();
  });
});
