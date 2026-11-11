import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HangyumiGame from "@/components/hangyumi/HangyumiGame";
import StarweaverStage from "@/components/starweaver/StarweaverStage";
import { duration, plan } from "@/lib/starweaver/presentation";
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
/* Wordvault's page waits for its Yumi to land: the stand-in lands at once. */
vi.mock("@/components/wordvault/WordvaultStage", async () => {
  const { useEffect } = await import("react");
  function Stage({ dealt, dressed, onArrived }: { dealt: boolean; dressed: boolean; onArrived: () => void }) {
    useEffect(() => { if (dealt && dressed) onArrived(); }, [dealt, dressed, onArrived]);
    return <div data-testid="vault" />;
  }
  return { default: Stage };
});
vi.mock("@/components/shop/EnergyCookie", () => ({ default: () => <span aria-hidden="true" /> }));
vi.mock("@/components/shop/ShopThumb", () => ({ default: ({ item }: { item: { id: string } }) => <span data-testid="thumb" data-item={item.id} /> }));
/* jsdom has no WebGL: the studio cannot be built, and the flat chart stands in. */
vi.mock("@/lib/starweaver/studio", () => ({ createStarweaverStudio: () => null }));
/* No WebGL here: the reveal keeps the relic's shop picture. */
vi.mock("@/lib/starweaver/relicShowcase", () => ({ createRelicShowcase: () => null }));
const liquid = vi.hoisted(() => ({ flows: [] as Array<{ kind: string; from: DOMRect | null; game?: string }> }));
vi.mock("@/lib/starweaver/liquid", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/starweaver/liquid")>()),
  flowLiquid: (kind: string, from: DOMRect | null, game?: string) => liquid.flows.push({ kind, from, game }),
}));

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
  liquid.flows.length = 0;
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

  it("on the seventh shows the relic whole, with its seal and a line about it, and puts it on when asked", async () => {
    const { wearPiece } = play(service({ voyages: 6, pick: ids => ids.includes("sw-orbit-drop") ? "sw-orbit-drop" : ids[0] }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    expect(await screen.findByText("The star gate opens!")).toBeInTheDocument();
    const reveal = await screen.findByRole("dialog", { name: "Orbit Drop" });
    expect(within(reveal).getByText("Brought back from the voyage")).toBeInTheDocument();
    expect(within(reveal).getByText("Seal 04 · Starwoven Relic")).toBeInTheDocument();
    expect(reveal).toHaveAccessibleDescription("A silver orbit wrapped round a small teardrop crystal, like a captured moon.");
    expect(within(reveal).getByTestId("thumb")).toHaveAttribute("data-item", "sw-orbit-drop");
    // Focus comes into the reveal, on its first way out.
    expect(within(reveal).getByRole("button", { name: "Wear it" })).toHaveFocus();
    fireEvent.click(within(reveal).getByRole("button", { name: "Wear it" }));
    expect(wearPiece).toHaveBeenCalledWith("sw-orbit-drop");
    expect(await within(reveal).findByRole("button", { name: "Wearing it" })).toBeDisabled();
  });

  it("carries on to the next word from the reveal", async () => {
    play(service({ voyages: 6 }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    const reveal = await screen.findByRole("dialog");
    fireEvent.click(within(reveal).getByRole("button", { name: "Carry on" }));
    expect(await screen.findByText("honest and direct")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the reveal, with its button or Escape, onto the result and its relic card", async () => {
    play(service({ voyages: 6, pick: ids => ids.includes("sw-orbit-drop") ? "sw-orbit-drop" : ids[0] }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Orbit Drop")).toBeInTheDocument();
    expect(screen.getByText("Brought back from the voyage")).toBeInTheDocument();
    // It does not come back by itself; the card carries on as before.
    fireEvent.click(screen.getByRole("button", { name: "Carry on" }));
    expect(await screen.findByText("honest and direct")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    play(service({ voyages: 6 }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("says nothing about relics on an ordinary word", async () => {
    play(service({ voyages: 1 }));
    await screen.findByText("a round fruit");
    for (const char of ["a", "p", "l", "e"]) await guess(char);
    await screen.findByText("The star gate opens!");
    expect(screen.queryByText("Brought back from the voyage")).toBeNull();
    expect(screen.queryByRole("button", { name: "Wear it" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
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

  it("lights one piece of track for each place filled", async () => {
    const { container } = render(<StarweaverStage round={round({})} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(container.querySelectorAll('path[data-lit="true"]')).toHaveLength(3);
    expect(container.querySelectorAll('path[data-lit="false"]')).toHaveLength(2);
  });

  it("sends out U, then I, then O, and opens the gate only for a word won", async () => {
    const { container, rerender } = render(<StarweaverStage round={round({ misses: 2 })} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    const out = () => [...container.querySelectorAll('text[data-out="true"]')].map(node => node.textContent);
    expect(out()).toEqual(["U", "I"]);
    rerender(<StarweaverStage round={round({ status: "lost", misses: 3, slots: [{ letter: true, char: "a" }, { letter: true, char: "b" }] })} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-open", "false");
    expect(out()).toEqual([]);
    rerender(<StarweaverStage round={round({ status: "won", slots: [{ letter: true, char: "a" }] })} outfit={null} dressed dealt onArrived={() => {}} label="chart" skipLabel="skip" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-open", "true");
  });

  it("lets the page lay out when there is no studio to arrive in", async () => {
    const arrived = vi.fn();
    render(<StarweaverStage round={null} outfit={null} dressed dealt onArrived={arrived} label="chart" skipLabel="skip" />);
    await waitFor(() => expect(arrived).toHaveBeenCalled());
  });
});

describe("the wallet never sells a relic", () => {
  it("refuses to buy one, as the database does", async () => {
    const wallet = createPreviewWallet(100_000);
    await expect(wallet.buy("sw-orbit-drop")).rejects.toThrow();
  });
});

describe("the show, planned from the round before and after", () => {
  const before = (over: Partial<HangyumiRound> = {}): HangyumiRound => readRound({
    id: "r", status: "playing", language: "en", level: "B1", game: "starweaver",
    slots: [
      { letter: true, char: null }, { letter: true, char: null }, { letter: true, char: null },
      { letter: true, char: null }, { letter: true, char: null },
    ],
    guessed: [], misses: 0, ...over,
  } as never);
  const word = (chars: (string | null)[], guessed: string[], over: Record<string, unknown> = {}) => readRound({
    id: "r", status: "playing", language: "en", level: "B1", game: "starweaver",
    slots: chars.map(char => ({ letter: true, char })), guessed, misses: 0, ...over,
  } as never);

  it("weaves a letter quickly, and several places of one letter as one batch", () => {
    const one = plan(before(), word(["a", null, null, null, null], ["a"]));
    expect(one).toEqual([expect.objectContaining({ phase: "weave", places: [0] })]);
    expect(one[0].seconds).toBeGreaterThanOrEqual(0.28);
    expect(one[0].seconds).toBeLessThanOrEqual(0.42);
    const many = plan(before(), word([null, "p", "p", null, null], ["p"]));
    expect(many).toEqual([expect.objectContaining({ phase: "weave", places: [1, 2] })]);
    expect(many[0].seconds).toBeLessThanOrEqual(0.5);
  });

  it("sends U, then I, then O out, and the third brings them all home within 0.9–1.2 s", () => {
    const first = plan(before(), word([null, null, null, null, null], ["z"], { misses: 1 }));
    expect(first).toEqual([expect.objectContaining({ phase: "release", piece: 0 })]);
    expect(first[0].seconds).toBeGreaterThanOrEqual(0.45);
    expect(first[0].seconds).toBeLessThanOrEqual(0.6);
    const third = plan(before({ misses: 2 }), word(["a", "b", "c", "d", "e"], ["x", "y", "z"], { status: "lost", misses: 3 }));
    expect(third.map(beat => beat.phase)).toEqual(["release", "recall"]);
    expect(third[0].piece).toBe(2);
    expect(duration(third)).toBeGreaterThanOrEqual(0.9);
    expect(duration(third)).toBeLessThanOrEqual(1.2);
  });

  it("never weaves the answer a lost round shows, and never opens the gate for it", () => {
    const lost = plan(before({ misses: 2 }), word(["a", "b", "c", "d", "e"], ["q", "x", "z"], { status: "lost", misses: 3 }));
    expect(lost.some(beat => beat.phase === "weave" || beat.phase === "voyage")).toBe(false);
  });

  it("plays a won word in 1.6–2.2 s, and a seventh's relic in at most 0.9 s more", () => {
    const won = plan(before({ misses: 1 }), word(["a", "a", "a", "a", "a"], ["z", "a"], { status: "won", misses: 1 }));
    expect(won.map(beat => beat.phase)).toEqual(["weave", "recall", "close", "voyage"]);
    expect(duration(won)).toBeGreaterThanOrEqual(1.6);
    expect(duration(won)).toBeLessThanOrEqual(2.2);
    const seventh = plan(before(), word(["a", "a", "a", "a", "a"], ["a"], {
      status: "won", starweaver: { completedTotal: 7, cycleProgress: 0, cycleLength: 7, award: { id: 1, itemId: "sw-orbit-drop" } },
    }));
    expect(seventh.at(-1)).toEqual(expect.objectContaining({ phase: "relic" }));
    expect(seventh.at(-1)!.seconds).toBeLessThanOrEqual(0.9);
  });

  it("takes as long for a long word as for a short one", () => {
    const short = plan(readRound({ id: "s", status: "playing", language: "en", level: "B1", game: "starweaver", slots: [{ letter: true, char: null }, { letter: true, char: null }], guessed: [] } as never),
      readRound({ id: "s", status: "won", language: "en", level: "B1", game: "starweaver", slots: [{ letter: true, char: "a" }, { letter: true, char: "a" }], guessed: ["a"] } as never));
    const long = plan(readRound({ id: "l", status: "playing", language: "en", level: "C2", game: "starweaver", slots: Array.from({ length: 14 }, () => ({ letter: true, char: null })), guessed: [] } as never),
      readRound({ id: "l", status: "won", language: "en", level: "C2", game: "starweaver", slots: Array.from({ length: 14 }, () => ({ letter: true, char: "a" })), guessed: ["a"] } as never));
    expect(duration(long)).toBe(duration(short));
  });

  it("plays nothing for a guess sent again", () => {
    expect(plan(before(), { ...word(["a", null, null, null, null], ["a"]), hit: false, repeat: true, paid: { letter: 0, word: 0, already: false, capped: false }, balance: null })).toEqual([]);
  });
});

describe("the liquid light", () => {
  it("flows from a right letter's key, larger for the word, and in dark red for a miss", async () => {
    play(service({ voyages: 1 }));
    await screen.findByText("a round fruit");
    await guess("a");
    expect(liquid.flows.at(-1)).toEqual(expect.objectContaining({ kind: "letter", game: "starweaver" }));
    expect(liquid.flows.at(-1)!.from).not.toBeNull();
    await guess("z");
    expect(liquid.flows.at(-1)).toEqual(expect.objectContaining({ kind: "miss", game: "starweaver" }));
    expect(liquid.flows).toHaveLength(2);
    for (const char of ["p", "l", "e"]) await guess(char);
    expect(liquid.flows.at(-1)).toEqual(expect.objectContaining({ kind: "word" }));
  });

  it("flows in the other two games too, in their own colours", async () => {
    for (const game of ["hangyumi", "wordvault"] as const) {
      liquid.flows.length = 0;
      const loadWallet = vi.fn(async () => ({ outfit: {}, balance: 240 }));
      const { unmount } = render(<HangyumiGame service={service()} defaultLanguage="en" loadWallet={loadWallet} game={game} />);
      await screen.findByText("a round fruit");
      await guess("a");
      await guess("z");
      expect(liquid.flows).toEqual([
        expect.objectContaining({ kind: "letter", game }),
        expect.objectContaining({ kind: "miss", game }),
      ]);
      unmount();
    }
  });

  it("asks the overlay for a flow from the key towards the stage", async () => {
    const { flowLiquid, LIQUID_EVENT } = await vi.importActual<typeof import("@/lib/starweaver/liquid")>("@/lib/starweaver/liquid");
    const heard: unknown[] = [];
    const listener = (event: Event) => heard.push((event as CustomEvent).detail);
    window.addEventListener(LIQUID_EVENT, listener);
    flowLiquid("word", new DOMRect(10, 700, 40, 50));
    window.removeEventListener(LIQUID_EVENT, listener);
    expect(heard).toEqual([expect.objectContaining({ kind: "word", game: "starweaver", from: { x: 30, y: 725 } })]);
  });
});
